import { GPU_SHADER_STAGE, PREMULTIPLIED_BLEND } from "./constants.ts";
import { createBinding } from "./create-binding.ts";
import { createPackedBuffer } from "./create-packed-buffer.ts";
import { roleBits } from "./effect-roles.ts";
import { instanceRange } from "./instance-range.ts";
import { lastResultOf } from "./last-result-of.ts";
import type { EffectColor } from "./parse-css-color.ts";
import { readFill } from "./read-element-box.ts";
import { ringLapAt, ringLapEnd, type RingLap } from "./ring-lap-at.ts";
import { ringLightColors } from "./ring-light-colors.ts";
import {
  packRingLightInstances,
  PAGE_TINT,
  RING_LIGHT_INSTANCE_BYTES,
  RING_LIGHT_WGSL,
  type RingLightInstance,
} from "./ring-light-wgsl.ts";
import { isLightBackdrop } from "./ripple-color.ts";
import type { Effect, EffectElementRecord, EffectFrame } from "./types.ts";

const RING_LIGHT = roleBits(["ringLight"]);

/**
 * The colours of a ring light in `fill` over `backdrop`: every field of a
 * `RingLightInstance` except its element and its state.
 */
function ringLightPaint(fill: EffectColor, backdrop: EffectColor) {
  return {
    ...ringLightColors(fill, backdrop),
    alpha: Math.sqrt(fill[3]),
    pageTint: isLightBackdrop(backdrop) ? PAGE_TINT.light : PAGE_TINT.dark,
  };
}

/** A lap on one element, with the colour it takes. */
interface ElementLap extends RingLap {
  /** The element's `color` when the lap started. */
  readonly fill: EffectColor;
  /** `ringLightPaint`, which computes again only for a new backdrop. */
  readonly paint: typeof ringLightPaint;
}

/**
 * A lap from the middle of the element's inline-start edge, running
 * clockwise in a left-to-right element and anticlockwise in a right-to-left
 * one, so that it sets off over the top the way the text reads.
 */
function lapFrom(record: EffectElementRecord, time: number): ElementLap {
  const style = getComputedStyle(record.element);
  const rtl = style.direction === "rtl";
  return {
    start: time,
    x: rtl ? record.x + record.width : record.x,
    y: record.y + record.height / 2,
    direction: rtl ? -1 : 1,
    fill: readFill(style.color),
    paint: lastResultOf(ringLightPaint),
  };
}

/**
 * Ring light: runs one lap of light round the outline of each element with
 * the role, once, from the first frame it is on the effect layer, in the
 * colour of its `color`, as `useRingLight` describes. It asks for frames
 * only while a lap runs.
 *
 * @internal
 */
export const ringLightEffect: Effect = {
  async setup({ device, format, pageLayout, targetLayout, requestFrame }) {
    const layout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPU_SHADER_STAGE.VERTEX | GPU_SHADER_STAGE.FRAGMENT,
          buffer: { type: "read-only-storage" },
        },
      ],
    });
    const module = device.createShaderModule({ code: RING_LIGHT_WGSL });
    // A lap starts on the first frame its element is seen, so it waits for
    // the pipeline: otherwise the start of the lap would not show.
    const pipeline = await device.createRenderPipelineAsync({
      layout: device.createPipelineLayout({
        bindGroupLayouts: [pageLayout, targetLayout, layout],
      }),
      vertex: { module, entryPoint: "ringLightVertex" },
      fragment: {
        module,
        entryPoint: "ringLightFragment",
        targets: [{ format, blend: PREMULTIPLIED_BLEND }],
      },
      primitive: { topology: "triangle-strip" },
    });
    const buffer = createPackedBuffer(
      device,
      RING_LIGHT_INSTANCE_BYTES,
      packRingLightInstances,
    );
    const binding = createBinding(device, layout, [buffer]);
    /** Each element's lap, kept after it is over so that it runs once. */
    const laps = new Map<number, ElementLap>();
    let rings: readonly RingLightInstance[] = [];
    let endTimer: ReturnType<typeof setTimeout> | undefined;
    let scheduledEnd: number | null = null;

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
      update(_encoder, frame: EffectFrame) {
        const instances: RingLightInstance[] = [];
        let nextEnd = Infinity;
        const kept = new Set<number>();
        for (const [index, record] of frame.elements.entries()) {
          if ((record.roles & RING_LIGHT) === 0) {
            continue;
          }
          kept.add(record.id);
          const lap = laps.get(record.id) ?? lapFrom(record, frame.time);
          laps.set(record.id, lap);
          const box = {
            x: record.x,
            y: record.y,
            width: record.width,
            height: record.height,
            radius: Math.min(...record.radii),
          };
          const state = ringLapAt(lap, box, frame.time, frame.reducedMotion);
          if (state === null) {
            continue;
          }
          instances.push({
            elementIndex: index,
            state,
            ...lap.paint(lap.fill, frame.scopes[record.scopeIndex].backdrop),
          });
          nextEnd = Math.min(nextEnd, ringLapEnd(lap, frame.reducedMotion));
        }
        for (const id of laps.keys()) {
          if (!kept.has(id)) {
            laps.delete(id);
          }
        }
        scheduleEnd(
          frame.reducedMotion && instances.length > 0 ? nextEnd : null,
          frame.time,
        );
        rings = instances;
        buffer.write(instances);
        return instances.length > 0 && !frame.reducedMotion;
      },
      draw(pass, target) {
        const [first, count] = instanceRange(
          rings,
          target.firstElement,
          target.elementCount,
        );
        if (count > 0) {
          pass.setPipeline(pipeline);
          pass.setBindGroup(2, binding());
          pass.draw(4, count, 0, first);
        }
      },
      destroy() {
        clearTimeout(endTimer);
        buffer.destroy();
      },
    };
  },
};
