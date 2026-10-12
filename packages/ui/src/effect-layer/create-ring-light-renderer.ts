import { GPU_SHADER_STAGE, PREMULTIPLIED_BLEND } from "./constants.ts";
import { createBinding } from "./create-binding.ts";
import { createPackedBuffer } from "./create-packed-buffer.ts";
import { ringLightColors } from "./glow-colors.ts";
import { instanceRange } from "./instance-range.ts";
import type { EffectColor } from "./parse-css-color.ts";
import type { RingLightBox } from "./ring-light-at.ts";
import type { RING_LAP_LOOK } from "./ring-light-wgsl.ts";
import {
  packRingLightInstances,
  RING_LIGHT_INSTANCE_BYTES,
  RING_LIGHT_LOOK,
  RING_LIGHT_WGSL,
  type RingLightInstance,
} from "./ring-light-wgsl.ts";
import { isLightBackdrop } from "./ripple-color.ts";
import type {
  EffectElementRecord,
  EffectFrame,
  EffectSetup,
  EffectTarget,
} from "./types.ts";

/**
 * One ring light for the renderer's `update`: what it draws this frame, and
 * when it is over, in seconds on the effect layer's clock.
 *
 * @internal
 */
export interface RingLightDraw extends RingLightInstance {
  readonly end: number;
}

/**
 * The box a ring light runs around on a measured element.
 *
 * @internal
 */
export function ringLightBox(record: EffectElementRecord): RingLightBox {
  return {
    x: record.x,
    y: record.y,
    width: record.width,
    height: record.height,
    radius: Math.min(...record.radii),
  };
}

/**
 * The colours and the look of a ring light in `fill` over `backdrop`: every
 * field of a `RingLightInstance` except its element and its state.
 *
 * @internal
 */
export function ringLightPaint(
  fill: EffectColor,
  backdrop: EffectColor,
  looks: typeof RING_LIGHT_LOOK | typeof RING_LAP_LOOK = RING_LIGHT_LOOK,
) {
  const { core, tint, bloom } = ringLightColors(fill, backdrop);
  const look = isLightBackdrop(backdrop) ? looks.light : looks.dark;
  return {
    core,
    tint,
    bloom: [bloom[0], bloom[1], bloom[2], look.bloom] as const,
    alpha: Math.sqrt(fill[3]),
    inset: look.inset,
    pageTint: look.pageTint,
  };
}

/**
 * Draws ring lights for an effect: the pipeline of `RING_LIGHT_WGSL`, its
 * instance buffer, and, under reduced motion, the frame that takes a still
 * glow away when it is due. The pipeline compiles in the background; until
 * `ready` settles, `draw` draws nothing.
 *
 * @internal
 */
export function createRingLightRenderer({
  device,
  format,
  pageLayout,
  targetLayout,
  requestFrame,
}: EffectSetup) {
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
  let pipeline: GPURenderPipeline | null = null;
  const ready = device
    .createRenderPipelineAsync({
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
    })
    .then(
      (compiled) => {
        pipeline = compiled;
      },
      (error: unknown) => {
        reportError(error);
      },
    );
  const buffer = createPackedBuffer(
    device,
    RING_LIGHT_INSTANCE_BYTES,
    packRingLightInstances,
  );
  const binding = createBinding(device, layout, [buffer]);
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
    /** Settles once the pipeline has compiled, or failed to. */
    ready,
    /** Takes this frame's ring lights, in the order of their elements. */
    update(
      instances: readonly RingLightDraw[],
      frame: Pick<EffectFrame, "time" | "reducedMotion">,
    ) {
      scheduleEnd(
        frame.reducedMotion && instances.length > 0
          ? Math.min(...instances.map((instance) => instance.end))
          : null,
        frame.time,
      );
      rings = instances;
      buffer.write(instances);
    },
    draw(pass: GPURenderPassEncoder, target: EffectTarget) {
      const [first, count] = instanceRange(
        rings,
        target.firstElement,
        target.elementCount,
      );
      if (pipeline !== null && count > 0) {
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
}
