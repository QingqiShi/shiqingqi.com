import { d, std } from "typegpu";
import { FLAG_VERTICAL } from "./liquid-instance-value.ts";
import type { LiquidInstance } from "./liquid-layout.ts";
import { EffectElement } from "./page-layout.ts";

/** @internal */
export type Liquid = d.Infer<typeof LiquidInstance>;
/** @internal */
export type Track = d.Infer<typeof EffectElement>;

const isVertical = (liquid: Liquid) => {
  "use gpu";
  return (liquid.flags & FLAG_VERTICAL) !== 0;
};

/**
 * A vertical track draws in its own frame: the page turned over the
 * diagonal through the origin, so that the liquid runs along x there as on
 * a horizontal track. The turn is its own inverse.
 *
 * @internal
 */
export const toTrackFrame = (liquid: Liquid, page: d.v2f) => {
  "use gpu";
  return std.select(
    page,
    liquid.origin.add(page.sub(liquid.origin).yx),
    isVertical(liquid),
  );
};

/** @internal */
export const trackInFrame = (liquid: Liquid, track: Track) => {
  "use gpu";
  const turned = EffectElement(track);
  if (isVertical(liquid)) {
    turned.rect = d.vec4f(toTrackFrame(liquid, track.rect.xy), track.rect.wz);
    turned.radii = track.radii.xwzy;
  }
  return turned;
};

/**
 * A direction on the page, such as the way to the light, in the track's frame.
 *
 * @internal
 */
export const frameDir = (liquid: Liquid, page: d.v3f) => {
  "use gpu";
  return std.select(page, page.yxz, isVertical(liquid));
};

/**
 * One CSS px up the page, in the track's frame.
 *
 * @internal
 */
export const pageUp = (liquid: Liquid) => {
  "use gpu";
  return frameDir(liquid, d.vec3f(0, 1, 0)).xy;
};
