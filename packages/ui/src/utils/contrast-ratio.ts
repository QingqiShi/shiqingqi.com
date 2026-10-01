import { hexChannels } from "./hex-channels.ts";

/**
 * An sRGB colour as its red, green and blue channels on the 0–255 scale. A
 * channel can be fractional, as it is after alpha compositing.
 */
export type RgbChannels = readonly [r: number, g: number, b: number];

function channelToLinear(value: number) {
  const v = value / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

// https://www.w3.org/TR/WCAG22/#dfn-relative-luminance
function relativeLuminance(colour: string | RgbChannels) {
  const channels = typeof colour === "string" ? hexChannels(colour) : colour;
  const [r, g, b] = channels.map(channelToLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * The WCAG 2 contrast ratio of two opaque colours, from 1 to 21. The order of
 * the two colours does not change the result. A string must be `#RRGGBB`.
 */
export function contrastRatio(
  a: string | RgbChannels,
  b: string | RgbChannels,
): number {
  const [x, y] = [relativeLuminance(a), relativeLuminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
