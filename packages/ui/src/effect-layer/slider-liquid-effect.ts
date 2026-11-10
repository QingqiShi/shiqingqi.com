import {
  SliderLiquidInstance,
  sliderLiquidLayout,
} from "../_generated/wgsl/layouts.ts";
import { sliderLiquidWgsl } from "../_generated/wgsl/slider-liquid.ts";
import { clamp } from "../clamp.ts";
import { springPath } from "../motion/spring-path.ts";
import { createBinding } from "./create-binding.ts";
import { createInstancedDraw } from "./create-instanced-draw.ts";
import { createPackedBuffer } from "./create-packed-buffer.ts";
import { roleBits } from "./effect-roles.ts";
import { markEffectDrawn } from "./mark-effect-drawn.ts";
import type { EffectColor } from "./parse-css-color.ts";
import { readFill } from "./read-element-box.ts";
import type { RoleReader } from "./read-roles.ts";
import type { SliderLiquidInstance as SliderLiquidSchema } from "./slider-liquid-layout.ts";
import {
  sliderLiquidRuns,
  type SliderLiquidView,
} from "./slider-liquid-runs.ts";
import type { Effect, EffectInput } from "./types.ts";

const SLIDER_LIQUID = roleBits(["sliderLiquid"]);

/**
 * The attribute of the line that a Slider draws as its handle: the liquid
 * draws the handle in its colour.
 *
 * @internal
 */
export const SLIDER_HANDLE = "data-slider-handle";

/**
 * What the Slider liquid reads of a groove: the colour of its handle.
 *
 * @internal
 */
export interface SliderLiquidReading {
  readonly handle: EffectColor;
}

/** @internal */
export const sliderLiquidReader: RoleReader<SliderLiquidReading> = {
  read: (element, _box, { styleOf }) => {
    const handle = element.querySelector(`[${SLIDER_HANDLE}]`);
    return {
      handle:
        handle === null
          ? [0, 0, 0, 0]
          : readFill(styleOf(handle).backgroundColor),
    };
  },
};

/**
 * How the far edge of the liquid swells as it moves: it lags the panel's
 * speed by `lag` seconds of travel, up to `most` of the panel's height,
 * and springs back loosely, so it wobbles once or twice when the panel
 * stops.
 */
const BULGE = { lag: 0.014, most: 0.32 };
// The system springs settle without a wobble. Liquid that sloshes back
// needs one, so this spring has less damping than any spring role.
const BULGE_SPRING = { response: 1 / 2.4, dampingRatio: 0.34 };
/** The bulge is at rest this close to its goal, in px. */
const BULGE_DONE = 0.05;
/** Less melt than this shows nothing. */
const MIN_MELT = 0.002;

interface Bulge {
  readonly value: number;
  readonly speed: number;
}

const CALM: Bulge = { value: 0, speed: 0 };

function stepBulge(bulge: Bulge, view: SliderLiquidView, delta: number) {
  const most = BULGE.most * view.inner[3];
  const goal = clamp(view.velocity * BULGE.lag, -most, most);
  const { value, velocity } = springPath(
    BULGE_SPRING,
    { value: bulge.value, velocity: bulge.speed },
    goal,
    BULGE_DONE,
  ).at(delta);
  return { value: clamp(value, -most, most), speed: velocity };
}

/**
 * The effect behind a Slider's liquid panel. While a press melts the
 * panel, as `sliderLiquidRuns` tells, it draws the panel as clear liquid
 * over the groove: the groove's content shows through it from the
 * snapshot, bent under its rim, and its far edge swells and wobbles as the
 * panel moves. It marks the groove with `markEffectDrawn` while it draws,
 * so the Slider fades its own panel out as the liquid fades in. It draws
 * nothing under reduced motion, or until the groove has a snapshot: then
 * the Slider keeps its solid panel.
 *
 * @internal
 */
export const sliderLiquidEffect: Effect = {
  async setup(setup) {
    const { device, colorTarget, requestFrame } = setup;
    const liquid = await createInstancedDraw(
      device,
      sliderLiquidWgsl,
      colorTarget,
    );
    const buffer = createPackedBuffer(device, SliderLiquidInstance);
    const binding = createBinding(device, sliderLiquidLayout, () => ({
      sliders: buffer.buffer,
    }));
    const stopListening = sliderLiquidRuns.onStart(requestFrame);
    const bulges = new Map<Element, Bulge>();
    const drawn = new Set<Element>();
    let instances: { readonly elementIndex: number }[] = [];
    return {
      update(_encoder, frame) {
        const next: { readonly elementIndex: number }[] = [];
        const values: EffectInput<typeof SliderLiquidSchema>[] = [];
        const seen = new Set<Element>();
        let running = false;
        for (const [index, record] of frame.elements.entries()) {
          if ((record.roles & SLIDER_LIQUID) === 0) continue;
          const show = sliderLiquidRuns.get(record.element);
          if (show === undefined) {
            bulges.delete(record.element);
            continue;
          }
          running = true;
          const view = show();
          const bulge = stepBulge(
            bulges.get(record.element) ?? CALM,
            view,
            frame.delta,
          );
          bulges.set(record.element, bulge);
          if (
            frame.reducedMotion ||
            view.melt <= MIN_MELT ||
            !frame.drawContent(record, "cover")
          ) {
            continue;
          }
          const { handle } = view;
          next.push({ elementIndex: index });
          values.push({
            element: index,
            dark: frame.scopes[record.scopeIndex].dark ? 1 : 0,
            melt: clamp(view.melt, 0, 1),
            size: view.size,
            edge: view.edge,
            bulge: bulge.value,
            inner: view.inner,
            corner: view.corner,
            cornerPower: view.cornerPower,
            handleRadius: handle.radius,
            handleX: handle.x,
            handleCenter: handle.center,
            handleTop: handle.top,
            under: record.fill,
            handleColor: record.readings.sliderLiquid?.handle ?? [0, 0, 0, 0],
          });
          seen.add(record.element);
        }
        for (const element of drawn) {
          if (!seen.has(element)) {
            drawn.delete(element);
            markEffectDrawn(element, false);
          }
        }
        for (const element of seen) {
          if (!drawn.has(element)) {
            drawn.add(element);
            markEffectDrawn(element, true);
          }
        }
        buffer.write(values);
        instances = next;
        return running;
      },
      draw(pass, target) {
        liquid.draw(pass, target, instances, binding);
      },
      destroy() {
        stopListening();
        for (const element of drawn) {
          markEffectDrawn(element, false);
        }
        drawn.clear();
        buffer.destroy();
      },
    };
  },
};
