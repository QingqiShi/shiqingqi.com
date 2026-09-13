import { Cam16 } from "../../../apps/web/src/vendor/material-color-utilities/cam16.ts";
import {
  argbFromLinrgb,
  yFromLstar,
} from "../../../apps/web/src/vendor/material-color-utilities/color_utils.ts";
import { Hct } from "../../../apps/web/src/vendor/material-color-utilities/hct.ts";
import { ViewingConditions } from "../../../apps/web/src/vendor/material-color-utilities/viewing_conditions.ts";
import { tintOf } from "./tint-of.ts";

// The vendored colour utilities keep this matrix private.
const XYZ_TO_LINRGB = [
  [3.2413774792388685, -1.5376652402851851, -0.49885366846268053],
  [-0.9691452513005321, 1.8758853451067872, 0.04156585616912061],
  [0.05562093689691305, -0.20395524564742123, 1.0571799111220335],
] as const;
const Y_FROM_LINRGB = [0.2126, 0.7152, 0.0722] as const;
const J_ITERATIONS = 32;
const J_CEILING = 150;
// The same allowance HCT's own solver gives a channel past the gamut edge.
const GAMUT_SLACK = 0.01;
const TINT_ITERATIONS = 16;

const radians = (degrees: number) => (degrees * Math.PI) / 180;

function linrgbAt(j: number, chroma: number, hue: number): number[] {
  const xyz = Cam16.fromJch(j, chroma, hue).xyzInViewingConditions(
    ViewingConditions.DEFAULT,
  );
  return XYZ_TO_LINRGB.map(
    (row) => row[0] * xyz[0] + row[1] * xyz[1] + row[2] * xyz[2],
  );
}

function luminance(linrgb: readonly number[]): number {
  return (
    Y_FROM_LINRGB[0] * linrgb[0] +
    Y_FROM_LINRGB[1] * linrgb[1] +
    Y_FROM_LINRGB[2] * linrgb[2]
  );
}

/**
 * The argb of (hue, chroma, tone), found by bisection on CAM16 lightness J
 * until the luminance matches the tone, or null when that colour leaves the
 * sRGB gamut.
 */
function placeInCam16(
  hue: number,
  chroma: number,
  tone: number,
): number | null {
  const y = yFromLstar(tone);
  let low = 0;
  let high = J_CEILING;
  for (let index = 0; index < J_ITERATIONS; index++) {
    const mid = (low + high) / 2;
    if (luminance(linrgbAt(mid, chroma, hue)) < y) low = mid;
    else high = mid;
  }
  const linrgb = linrgbAt((low + high) / 2, chroma, hue);
  const inGamut = linrgb.every(
    (channel) => channel >= -GAMUT_SLACK && channel <= 100 + GAMUT_SLACK,
  );
  return inGamut ? argbFromLinrgb(linrgb) : null;
}

/**
 * The argb at `tone` that carries as much of the tint of (hue, chroma) as the
 * sRGB gamut holds, on the same tint hue. The tint is measured from the sRGB
 * gray at that tone, so the search walks out from that gray and never leaves
 * the hue.
 */
export function placeTintInCam16(
  hue: number,
  chroma: number,
  tone: number,
): number | null {
  const neutral = Hct.from(0, 0, tone);
  const wanted = tintOf(hue, chroma, neutral);
  const neutralA = neutral.chroma * Math.cos(radians(neutral.hue));
  const neutralB = neutral.chroma * Math.sin(radians(neutral.hue));
  const at = (strength: number): number | null => {
    const a = neutralA + strength * Math.cos(radians(wanted.hue));
    const b = neutralB + strength * Math.sin(radians(wanted.hue));
    return placeInCam16(
      (Math.atan2(b, a) * 180) / Math.PI,
      Math.hypot(a, b),
      tone,
    );
  };
  const full = at(wanted.chroma);
  if (full !== null) return full;
  let best = at(0);
  let low = 0;
  let high = wanted.chroma;
  for (let index = 0; index < TINT_ITERATIONS; index++) {
    const mid = (low + high) / 2;
    const candidate = at(mid);
    if (candidate === null) {
      high = mid;
    } else {
      best = candidate;
      low = mid;
    }
  }
  return best;
}
