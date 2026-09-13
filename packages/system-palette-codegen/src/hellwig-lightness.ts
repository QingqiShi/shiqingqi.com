import {
  whitePointD65,
  xyzFromArgb,
  yFromLstar,
} from "../../../apps/web/src/vendor/material-color-utilities/color_utils.ts";
import { argbFromHex } from "../../../apps/web/src/vendor/material-color-utilities/string_utils.ts";

// Hellwig & Fairchild (2022): CAM16 extended for the Helmholtz-Kohlrausch
// effect, so a saturated colour rates brighter than a gray of the same
// luminance. Constants follow the colour-science reference implementation.
// Viewing conditions are the HCT defaults: D65, average surround, adapting
// luminance from L* 50, background L* 50.
const CAT16 = [
  [0.401288, 0.650173, -0.051461],
  [-0.250268, 1.204414, 0.045854],
  [-0.002079, 0.048952, 0.953127],
] as const;
const SURROUND_F = 1;
const SURROUND_C = 0.69;
const SURROUND_NC = 1;
const WHITE = whitePointD65();
const ADAPTING_LUMINANCE = ((200 / Math.PI) * yFromLstar(50)) / 100;
const BACKGROUND_Y = yFromLstar(50);

const n = BACKGROUND_Y / WHITE[1];
const z = 1.48 + Math.sqrt(n);
const k = 1 / (5 * ADAPTING_LUMINANCE + 1);
const fl =
  0.2 * k ** 4 * (5 * ADAPTING_LUMINANCE) +
  0.1 * (1 - k ** 4) ** 2 * Math.cbrt(5 * ADAPTING_LUMINANCE);
const degree = Math.min(
  1,
  Math.max(
    0,
    SURROUND_F * (1 - (1 / 3.6) * Math.exp((-ADAPTING_LUMINANCE - 42) / 92)),
  ),
);

function toCat16(xyz: readonly number[]): number[] {
  return CAT16.map(
    (row) => row[0] * xyz[0] + row[1] * xyz[1] + row[2] * xyz[2],
  );
}

const rgbWhite = toCat16(WHITE);
const adaptation = rgbWhite.map(
  (channel) => (degree * WHITE[1]) / channel + 1 - degree,
);

function adapt(channel: number): number {
  const x = ((fl * Math.abs(channel)) / 100) ** 0.42;
  return (400 * Math.sign(channel) * x) / (27.13 + x) + 0.1;
}

function adaptedResponse(xyz: readonly number[]): number[] {
  return toCat16(xyz).map((channel, index) =>
    adapt(adaptation[index] * channel),
  );
}

function achromaticResponse([r, g, b]: readonly number[]): number {
  return 2 * r + g + 0.05 * b - 0.305;
}

const achromaticWhite = achromaticResponse(adaptedResponse(WHITE));

function eccentricity(h: number): number {
  return (
    -0.0582 * Math.cos(h) -
    0.0258 * Math.cos(2 * h) -
    0.1347 * Math.cos(3 * h) +
    0.0289 * Math.cos(4 * h) -
    0.1475 * Math.sin(h) -
    0.0308 * Math.sin(2 * h) +
    0.0385 * Math.sin(3 * h) +
    0.0096 * Math.sin(4 * h) +
    1
  );
}

function helmholtzKohlrausch(h: number): number {
  return (
    -0.16 * Math.cos(h) +
    0.132 * Math.cos(2 * h) -
    0.405 * Math.sin(h) +
    0.08 * Math.sin(2 * h) +
    0.792
  );
}

/** Hellwig 2022 lightness with the Helmholtz-Kohlrausch term (J_HK) of a hex colour. */
export function hellwigLightness(hex: string): number {
  const [r, g, b] = adaptedResponse(xyzFromArgb(argbFromHex(hex)));
  const a = r - (12 * g) / 11 + b / 11;
  const bb = (r + g - 2 * b) / 9;
  const h = Math.atan2(bb, a);
  const achromatic = Math.max(0, achromaticResponse([r, g, b]));
  const lightness = 100 * (achromatic / achromaticWhite) ** (SURROUND_C * z);
  const colourfulness = 43 * SURROUND_NC * eccentricity(h) * Math.hypot(a, bb);
  const chroma = (35 * colourfulness) / achromaticWhite;
  return lightness + helmholtzKohlrausch(h) * chroma ** 0.587;
}
