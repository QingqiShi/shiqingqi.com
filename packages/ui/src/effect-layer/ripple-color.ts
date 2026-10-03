import {
  clamp,
  oklabToLinearSrgb,
  toGamma,
  toLinear,
  type EffectColor,
} from "./parse-css-color.ts";

type Vector = readonly [number, number, number];

/**
 * How far, in OKLab, a ring's colour must be from the page behind it. Below
 * this a light card on a light page draws a ring that nobody can see.
 */
const MIN_DIFFERENCE = 0.18;

// The matrices come from Björn Ottosson's definition of OKLab.
function srgbToOklab([red, green, blue]: Vector): Vector {
  const [r, g, b] = [toLinear(red), toLinear(green), toLinear(blue)];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

const oklabToSrgb = (lab: Vector): Vector => {
  const [r, g, b] = oklabToLinearSrgb(lab);
  return [clamp(toGamma(r)), clamp(toGamma(g)), clamp(toGamma(b))];
};

/**
 * Whether the page behind the effect layer is light, so that a ring must be
 * darker than it to show.
 *
 * @internal
 */
export function isLightBackdrop(backdrop: EffectColor) {
  return srgbToOklab([backdrop[0], backdrop[1], backdrop[2]])[0] > 0.5;
}

/**
 * The sRGB colour of an element's ripple: its fill as it shows over the
 * page, moved in lightness away from the page until the two differ enough to
 * see. The hue and the chroma stay, so a fill that already stands out keeps
 * its colour, and a fill close to the page gets a ring a little darker on a
 * light page or a little lighter on a dark one.
 *
 * @internal
 */
export function rippleColor(fill: EffectColor, backdrop: EffectColor): Vector {
  const alpha = fill[3];
  const shown: Vector = [
    fill[0] * alpha + backdrop[0] * (1 - alpha),
    fill[1] * alpha + backdrop[1] * (1 - alpha),
    fill[2] * alpha + backdrop[2] * (1 - alpha),
  ];
  const ring = srgbToOklab(shown);
  const page = srgbToOklab([backdrop[0], backdrop[1], backdrop[2]]);
  const chromaDifference = Math.hypot(ring[1] - page[1], ring[2] - page[2]);
  const difference = Math.hypot(ring[0] - page[0], chromaDifference);
  if (difference >= MIN_DIFFERENCE) {
    return shown;
  }
  const lightness = Math.sqrt(MIN_DIFFERENCE ** 2 - chromaDifference ** 2);
  const direction = page[0] > 0.5 ? -1 : 1;
  return oklabToSrgb([page[0] + direction * lightness, ring[1], ring[2]]);
}
