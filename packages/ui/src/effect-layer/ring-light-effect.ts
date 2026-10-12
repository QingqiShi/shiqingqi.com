import {
  createRingLightRenderer,
  ringLightBox,
  ringLightPaint,
  type RingLightDraw,
} from "./create-ring-light-renderer.ts";
import { roleBits } from "./effect-roles.ts";
import { lastResultOf } from "./last-result-of.ts";
import type { EffectColor } from "./parse-css-color.ts";
import { readFill } from "./read-element-box.ts";
import { ringLapAt, ringLapEnd, type RingLap } from "./ring-light-at.ts";
import { RING_LAP_LOOK } from "./ring-light-wgsl.ts";
import type { Effect, EffectElementRecord, EffectFrame } from "./types.ts";

const RING_LIGHT = roleBits(["ringLight"]);

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
  async setup(setup) {
    const renderer = createRingLightRenderer(setup);
    // A lap starts on the first frame its element is seen, so it waits for
    // the pipeline: otherwise the start of the lap would not show.
    await renderer.ready;
    /** Each element's lap, kept after it is over so that it runs once. */
    const laps = new Map<number, ElementLap>();

    return {
      update(_encoder, frame: EffectFrame) {
        const instances: RingLightDraw[] = [];
        const kept = new Set<number>();
        for (const [index, record] of frame.elements.entries()) {
          if ((record.roles & RING_LIGHT) === 0) {
            continue;
          }
          kept.add(record.id);
          const lap = laps.get(record.id) ?? lapFrom(record, frame.time);
          laps.set(record.id, lap);
          const box = ringLightBox(record);
          const state = ringLapAt(lap, box, frame.time, frame.reducedMotion);
          if (state === null) {
            continue;
          }
          instances.push({
            elementIndex: index,
            state,
            end: ringLapEnd(lap, frame.reducedMotion),
            box,
            cornerExponent: record.cornerExponent,
            ...lap.paint(
              lap.fill,
              frame.scopes[record.scopeIndex].backdrop,
              RING_LAP_LOOK,
            ),
          });
        }
        for (const id of laps.keys()) {
          if (!kept.has(id)) {
            laps.delete(id);
          }
        }
        renderer.update(instances, frame);
        // Under reduced motion the still glow needs no frame until it goes,
        // which the renderer asks for.
        return instances.length > 0 && !frame.reducedMotion;
      },
      draw(pass, target) {
        renderer.draw(pass, target);
      },
      destroy() {
        renderer.destroy();
      },
    };
  },
};
