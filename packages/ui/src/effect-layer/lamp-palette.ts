import { beamColor, type Rgb } from "./beam-color.ts";
import type { EffectColor } from "./parse-css-color.ts";

/**
 * The colours of a Lamp's light: `core` at the thumb and under it, `glow`
 * further out.
 *
 * @internal
 */
export interface LampPalette {
  readonly core: Rgb;
  readonly glow: Rgb;
}

const WARM_WHITE: Rgb = [1, 0.97, 0.92];
const WARM_TINT: Rgb = [1, 0.78, 0.45];
/** How far the core moves towards warm white on a dark page. */
const DARK_CORE_WHITENING = 0.55;
/** How far the glow moves towards warm on a light page. */
const LIGHT_GLOW_WARMTH = 0.3;

const mix = (from: Rgb, to: Rgb, amount: number): Rgb => [
  from[0] + (to[0] - from[0]) * amount,
  from[1] + (to[1] - from[1]) * amount,
  from[2] + (to[2] - from[2]) * amount,
];

/**
 * The palette of a Lamp from its element's fill. On a dark page the light
 * adds to the page: the glow is the fill brightened until its strongest
 * channel is full, and the core moves most of the way to warm white, the
 * way a hot filament does. On a light page the light can only tint the
 * page: the core keeps the fill, darkened if it is too pale to show, and
 * the glow warms it, so a pool of tungsten-coloured light spreads from a
 * saturated centre.
 *
 * @internal
 */
export function lampPalette(fill: EffectColor, dark: boolean): LampPalette {
  const base = beamColor(fill, dark);
  return dark
    ? { core: mix(base, WARM_WHITE, DARK_CORE_WHITENING), glow: base }
    : { core: base, glow: mix(base, WARM_TINT, LIGHT_GLOW_WARMTH) };
}
