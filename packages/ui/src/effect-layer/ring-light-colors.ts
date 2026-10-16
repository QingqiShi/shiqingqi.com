import type { Rgb } from "./beam-color.ts";
import type { EffectColor } from "./parse-css-color.ts";
import {
  isLightBackdrop,
  oklabToSrgb,
  rippleColor,
  srgbToOklab,
} from "./ripple-color.ts";

const WHITE: Rgb = [1, 1, 1];

/**
 * On a light page the tint is the fill with more chroma and a little less
 * lightness, so that it reads as light through its saturation.
 */
const LIGHT_TINT = { chroma: 1.5, lightness: -0.06 } as const;
/** How far the glint's core goes from the tint towards white. */
const GLINT_HEAT = 0.92;
/**
 * How far the bloom goes from the tint towards white: far on a dark page,
 * and a little on a light page, where it must still differ from the page to
 * show.
 */
const BLOOM_HEAT = { dark: 0.55, light: 0.1 } as const;

/** The colours mix in sRGB, as the shader mixes them. */
const mix = (from: Rgb, to: Rgb, amount: number): Rgb => [
  from[0] + (to[0] - from[0]) * amount,
  from[1] + (to[1] - from[1]) * amount,
  from[2] + (to[2] - from[2]) * amount,
];

const opaque = (color: Rgb) => [...color, 1] as const;

function saturate(color: Rgb) {
  const [lightness, a, b] = srgbToOklab(color);
  return oklabToSrgb([
    lightness + LIGHT_TINT.lightness,
    a * LIGHT_TINT.chroma,
    b * LIGHT_TINT.chroma,
  ]);
}

/**
 * The colours of a ring light over a page. The tint is the fill, moved away
 * from the page until it shows, as a Ripple's ring is; a page cannot be
 * brighter than white, so on a light page the tint is saturated instead. A
 * comet's tail takes a hint of the tint. The core is a glint, near white.
 * The bloom round the core is the tint heated towards white, less so on a
 * light page, where white cannot show.
 *
 * @internal
 */
export function ringLightColors(fill: EffectColor, backdrop: EffectColor) {
  const shown = rippleColor(fill, backdrop);
  const light = isLightBackdrop(backdrop);
  const [red, green, blue] = light ? saturate(shown) : shown;
  const tint: Rgb = [red, green, blue];
  return {
    core: opaque(mix(tint, WHITE, GLINT_HEAT)),
    tint: opaque(tint),
    bloom: opaque(mix(tint, WHITE, light ? BLOOM_HEAT.light : BLOOM_HEAT.dark)),
  };
}
