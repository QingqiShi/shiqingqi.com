import { createBinding } from "./create-binding.ts";
import { createInstancedDraw } from "./create-instanced-draw.ts";
import { createPackedBuffer } from "./create-packed-buffer.ts";
import { roleBits } from "./effect-roles.ts";
import { lastResultOf } from "./last-result-of.ts";
import type { EffectColor } from "./parse-css-color.ts";
import { readFill } from "./read-element-box.ts";
import type { RoleReader } from "./read-roles.ts";
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

/**
 * What the ring light reads of an element: whether it reads right to left,
 * and its `color`.
 *
 * @internal
 */
export interface RingLightReading {
  readonly rtl: boolean;
  readonly color: EffectColor;
}

/** @internal */
export const ringLightReader: RoleReader<RingLightReading> = {
  read: (element, _box, { styleOf }) => {
    const style = styleOf(element);
    return { rtl: style.direction === "rtl", color: readFill(style.color) };
  },
};

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
function lapFrom(
  record: EffectElementRecord,
  { rtl, color }: RingLightReading,
  time: number,
): ElementLap {
  return {
    start: time,
    x: rtl ? record.x + record.width : record.x,
    y: record.y + record.height / 2,
    direction: rtl ? -1 : 1,
    fill: color,
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
  async setup(setup) {
    const { device } = setup;
    // A lap starts on the first frame its element is seen, so it waits for
    // the pipeline: otherwise the start of the lap would not show.
    const ringLight = await createInstancedDraw(
      setup,
      RING_LIGHT_WGSL,
      "ringLight",
    );
    const buffer = createPackedBuffer(
      device,
      RING_LIGHT_INSTANCE_BYTES,
      packRingLightInstances,
    );
    const binding = createBinding(device, ringLight.layout, [buffer]);
    /** Each element's lap, kept after it is over so that it runs once. */
    const laps = new Map<number, ElementLap>();
    let rings: readonly RingLightInstance[] = [];
    return {
      update(_encoder, frame: EffectFrame) {
        const instances: RingLightInstance[] = [];
        let nextEnd = Infinity;
        const kept = new Set<number>();
        for (const [index, record] of frame.elements.entries()) {
          const reading = record.readings.ringLight;
          if ((record.roles & RING_LIGHT) === 0 || reading === undefined) {
            continue;
          }
          kept.add(record.id);
          const lap =
            laps.get(record.id) ?? lapFrom(record, reading, frame.time);
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
        rings = instances;
        buffer.write(instances);
        if (instances.length === 0) {
          return false;
        }
        // Under reduced motion no frame follows on its own, so ask for the
        // frame that takes a still glow away when it is due.
        return frame.reducedMotion ? nextEnd : true;
      },
      draw(pass, target) {
        ringLight.draw(pass, target, rings, binding);
      },
      destroy() {
        buffer.destroy();
      },
    };
  },
};
