import { Hct } from "../../../apps/web/src/vendor/material-color-utilities/hct.ts";
import { hexFromArgb } from "../../../apps/web/src/vendor/material-color-utilities/string_utils.ts";
import { placeTintInCam16 } from "./place-tint-in-cam16.ts";
import { hueDistance, tintOf } from "./tint-of.ts";

const ITERATIONS = 22;
// Below this chroma HCT takes its exact achromatic path.
const ACHROMATIC_CHROMA = 0.0001;
// 8-bit quantisation moves the chroma of a placed colour by up to about 0.3
// and, when the tint is faint, its hue by tens of degrees.
const CHROMA_TOLERANCE = 1;
const HUE_TOLERANCE = 45;
const HUELESS_TINT = 1;

// HCT places (hue, chroma, tone) exactly when it fits the sRGB gamut and
// otherwise returns the gamut boundary at that hue and tone. Near white that
// fallback is the most tinted colour there, not a less tinted one, and above
// tone 99 the boundary search can land on a different hue. So a placement
// counts only when its chroma does not exceed the request and its hue holds.
function place(
  hue: number,
  chroma: number,
  tone: number,
): { hex: string; fits: boolean } {
  const placed = Hct.from(hue, chroma, tone);
  const hex = hexFromArgb(placed.toInt()).toUpperCase();
  if (chroma < ACHROMATIC_CHROMA) return { hex, fits: true };
  const neutral = Hct.from(0, 0, placed.tone);
  const requested = tintOf(hue, chroma, neutral);
  const got = tintOf(placed.hue, placed.chroma, neutral);
  const fits =
    placed.chroma <= chroma + CHROMA_TOLERANCE &&
    (got.chroma < HUELESS_TINT ||
      hueDistance(got.hue, requested.hue) <= HUE_TOLERANCE);
  return { hex, fits };
}

/** The hex at (hue, tone) with the most chroma up to `chroma` that fits the gamut. */
export function hexAt(hue: number, chroma: number, tone: number): string {
  const direct = place(hue, chroma, tone);
  if (direct.fits) return direct.hex;
  // Near white HCT cannot place the colour: its Newton step overshoots the
  // gamut, and its fallback is the most tinted colour at that tone. Place as
  // much of the tint as fits in CAM16 instead.
  const tinted = placeTintInCam16(hue, chroma, tone);
  return tinted === null
    ? place(hue, 0, tone).hex
    : hexFromArgb(tinted).toUpperCase();
}

/**
 * The HCT tone of (hue, chroma) whose `measure` is nearest `target`, found by
 * bisection on the tone. `measure` must rise with tone.
 */
export function solveTone(
  hue: number,
  chroma: number,
  measure: (hex: string) => number,
  target: number,
): number {
  let low = 0;
  let high = 100;
  for (let index = 0; index < ITERATIONS; index++) {
    const mid = (low + high) / 2;
    if (measure(hexAt(hue, chroma, mid)) < target) low = mid;
    else high = mid;
  }
  const lowError = Math.abs(measure(hexAt(hue, chroma, low)) - target);
  const highError = Math.abs(measure(hexAt(hue, chroma, high)) - target);
  return lowError < highError ? low : high;
}
