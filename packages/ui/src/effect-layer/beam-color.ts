import { relativeLuminance } from "../contrast/contrast-ratio.ts";
import type { EffectColor } from "./parse-css-color.ts";

/**
 * Red, green and blue from 0 to 1, sRGB-encoded.
 *
 * @internal
 */
export type Rgb = readonly [number, number, number];

/** The relative luminance of an sRGB-encoded colour from 0 to 1. */
function luminance([red, green, blue]: readonly number[]) {
  return relativeLuminance([red * 255, green * 255, blue * 255]);
}

const NEUTRAL_LIGHT: Rgb = [1, 0.97, 0.92];
const NEUTRAL_INK: Rgb = [0.32, 0.33, 0.36];
/** How far a dark fill moves towards white on a dark page. */
const DARK_FILL_WHITENING = 0.6;
/** The most luminance a beam has on a light page. */
const LIGHT_PAGE_LUMINANCE = 0.3;

/**
 * The colour of the light a Light beam casts, from its element's fill. On a
 * dark page the fill is brightened until its strongest channel is full, and a
 * dark fill also moves towards white. On a light page the fill is darkened
 * until it stands out from the page. A transparent fill casts neutral light.
 *
 * @internal
 */
export function beamColor(fill: EffectColor, dark: boolean): Rgb {
  if (fill[3] < 0.05) {
    return dark ? NEUTRAL_LIGHT : NEUTRAL_INK;
  }
  const [red, green, blue] = fill;
  if (dark) {
    const peak = Math.max(red, green, blue);
    if (peak < 0.02) {
      return NEUTRAL_LIGHT;
    }
    const whitening = (1 - peak) * DARK_FILL_WHITENING;
    const brighten = (channel: number) =>
      (channel / peak) * (1 - whitening) + whitening;
    return [brighten(red), brighten(green), brighten(blue)];
  }
  const current = luminance(fill);
  if (current <= LIGHT_PAGE_LUMINANCE) {
    return [red, green, blue];
  }
  // Scaling linear light by k scales sRGB-encoded values by about k^(1/2.2).
  const scale = (LIGHT_PAGE_LUMINANCE / current) ** (1 / 2.2);
  return [red * scale, green * scale, blue * scale];
}
