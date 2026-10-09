import {
  GPU_BUFFER_USAGE,
  GPU_SHADER_STAGE,
  PREMULTIPLIED_BLEND,
} from "./constants.ts";
import { instanceRange } from "./create-ripples.ts";
import { roleBits } from "./effect-roles.ts";
import { readFill } from "./read-element-box.ts";
import { isLightBackdrop } from "./ripple-color.ts";
import { sweepAt, sweepEnd, type Sweep, type SweepBox } from "./sweep-at.ts";
import { sweepColors } from "./sweep-colors.ts";
import { readSweepDetail, SWEEP_EVENT } from "./sweep-event.ts";
import {
  packSweepInstances,
  SWEEP_INSTANCE_BYTES,
  SWEEP_PEAK_ALPHA,
  SWEEP_WGSL,
  type SweepInstance,
} from "./sweep-wgsl.ts";
import type { Effect, EffectElementRecord } from "./types.ts";

const SWEEP_BIT = roleBits(["sweep"]);
const MIN_CAPACITY = 4;

/** A Sweep in flight, with the fill its element had when it started. */
interface ActiveSweep extends Sweep {
  readonly fill: ReturnType<typeof readFill>;
}

function boxOf(record: EffectElementRecord): SweepBox {
  return {
    x: record.x,
    y: record.y,
    width: record.width,
    height: record.height,
    radius: Math.min(...record.radii),
  };
}

/**
 * The effect behind `useSweep`. It starts a Sweep from the `SWEEP_EVENT`
 * an element dispatches, so a change elsewhere costs no frame, and draws
 * frames only while a ring light runs.
 *
 * @internal
 */
export const sweepEffect: Effect = {
  async setup({ device, format, pageLayout, targetLayout, requestFrame }) {
    const sweepLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPU_SHADER_STAGE.VERTEX | GPU_SHADER_STAGE.FRAGMENT,
          buffer: { type: "read-only-storage" },
        },
      ],
    });
    const module = device.createShaderModule({ code: SWEEP_WGSL });
    const pipeline = await device.createRenderPipelineAsync({
      layout: device.createPipelineLayout({
        bindGroupLayouts: [pageLayout, targetLayout, sweepLayout],
      }),
      vertex: { module, entryPoint: "sweepVertex" },
      fragment: {
        module,
        entryPoint: "sweepFragment",
        targets: [{ format, blend: PREMULTIPLIED_BLEND }],
      },
      primitive: { topology: "triangle-strip" },
    });

    let capacity = 0;
    let buffer: GPUBuffer | null = null;
    let bindGroup: GPUBindGroup | null = null;
    let packed = new ArrayBuffer(0);
    function ensureCapacity(count: number) {
      if (count <= capacity) {
        return;
      }
      capacity = Math.max(MIN_CAPACITY, 2 ** Math.ceil(Math.log2(count)));
      buffer?.destroy();
      buffer = device.createBuffer({
        size: capacity * SWEEP_INSTANCE_BYTES,
        usage: GPU_BUFFER_USAGE.STORAGE | GPU_BUFFER_USAGE.COPY_DST,
      });
      bindGroup = device.createBindGroup({
        layout: sweepLayout,
        entries: [{ binding: 0, resource: { buffer } }],
      });
      packed = new ArrayBuffer(capacity * SWEEP_INSTANCE_BYTES);
    }

    const sweeps = new Map<Element, ActiveSweep>();
    let sweeping: ReadonlySet<Element> = new Set();
    let instances: SweepInstance[] = [];
    let clock = { time: 0, at: performance.now() };
    let endTimer: ReturnType<typeof setTimeout> | undefined;
    let scheduledEnd: number | null = null;

    const listeners = new AbortController();
    window.addEventListener(
      SWEEP_EVENT,
      (event) => {
        const { target } = event;
        const detail = readSweepDetail(event);
        if (!(target instanceof Element) || detail === null) {
          return;
        }
        const element = [...sweeping].find((candidate) =>
          candidate.contains(target),
        );
        if (element === undefined) {
          return;
        }
        sweeps.set(element, {
          start: clock.time + (performance.now() - clock.at) / 1000,
          x: detail.clientX + window.scrollX,
          y: detail.clientY + window.scrollY,
          fill: readFill(getComputedStyle(element).backgroundColor),
        });
        requestFrame();
      },
      { capture: true, passive: true, signal: listeners.signal },
    );

    // Under reduced motion no frame follows on its own, so the frame that
    // takes a still glow away is asked for when it is due.
    function scheduleEnd(nextEnd: number | null, time: number) {
      if (nextEnd === scheduledEnd) {
        return;
      }
      clearTimeout(endTimer);
      scheduledEnd = nextEnd;
      if (nextEnd !== null) {
        endTimer = setTimeout(
          () => {
            scheduledEnd = null;
            requestFrame();
          },
          Math.max(0, (nextEnd - time) * 1000) + 16,
        );
      }
    }

    return {
      update(_encoder, frame) {
        clock = { time: frame.time, at: performance.now() };
        const next = new Set<Element>();
        instances = [];
        let nextEnd: number | null = null;
        for (const [elementIndex, record] of frame.elements.entries()) {
          if ((record.roles & SWEEP_BIT) === 0) {
            continue;
          }
          next.add(record.element);
          const sweep = sweeps.get(record.element);
          if (sweep === undefined) {
            continue;
          }
          const box = boxOf(record);
          const state = sweepAt(sweep, box, frame.time, frame.reducedMotion);
          if (state === null) {
            sweeps.delete(record.element);
            continue;
          }
          if (frame.reducedMotion) {
            const end = sweepEnd(sweep, box, true);
            nextEnd = nextEnd === null ? end : Math.min(nextEnd, end);
          }
          const { backdrop } = frame.scopes[record.scopeIndex];
          const { core, halo } = sweepColors(sweep.fill, backdrop);
          instances.push({
            elementIndex,
            state,
            core,
            halo,
            alpha:
              (isLightBackdrop(backdrop)
                ? SWEEP_PEAK_ALPHA.light
                : SWEEP_PEAK_ALPHA.dark) * Math.sqrt(sweep.fill[3]),
          });
        }
        sweeping = next;
        for (const element of sweeps.keys()) {
          if (!next.has(element)) {
            sweeps.delete(element);
          }
        }
        scheduleEnd(nextEnd, frame.time);
        if (instances.length > 0) {
          ensureCapacity(instances.length);
          packSweepInstances(instances, packed);
          if (buffer !== null) {
            device.queue.writeBuffer(
              buffer,
              0,
              packed,
              0,
              instances.length * SWEEP_INSTANCE_BYTES,
            );
          }
        }
        return sweeps.size > 0;
      },
      draw(pass, target) {
        if (bindGroup === null) {
          return;
        }
        const [first, count] = instanceRange(
          instances,
          target.firstElement,
          target.elementCount,
        );
        if (count === 0) {
          return;
        }
        pass.setPipeline(pipeline);
        pass.setBindGroup(2, bindGroup);
        pass.draw(4, count, 0, first);
      },
      destroy() {
        clearTimeout(endTimer);
        listeners.abort();
        buffer?.destroy();
      },
    };
  },
};
