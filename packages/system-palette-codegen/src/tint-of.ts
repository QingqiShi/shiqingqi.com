import type { Hct } from "../../../apps/web/src/vendor/material-color-utilities/hct.ts";

const radians = (degrees: number) => (degrees * Math.PI) / 180;

/**
 * The tint of (hue, chroma) as seen against `neutral`, the HCT reading of the
 * sRGB gray at the same tone. HCT reads sRGB neutrals as chroma 1.8 to 2.9 at
 * hue 209, so a tint is the chroma vector minus that neutral's vector.
 */
export function tintOf(
  hue: number,
  chroma: number,
  neutral: Hct,
): { hue: number; chroma: number } {
  const a =
    chroma * Math.cos(radians(hue)) -
    neutral.chroma * Math.cos(radians(neutral.hue));
  const b =
    chroma * Math.sin(radians(hue)) -
    neutral.chroma * Math.sin(radians(neutral.hue));
  return { hue: (Math.atan2(b, a) * 180) / Math.PI, chroma: Math.hypot(a, b) };
}

export function hueDistance(a: number, b: number): number {
  return Math.abs(180 - Math.abs(Math.abs(a - b) - 180));
}
