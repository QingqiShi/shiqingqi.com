import { toGamma, toLinear, type EffectColor } from "./parse-css-color.ts";

/**
 * The relative luminance a dust particle keeps clear of the page: at most
 * this on a light page, so it reads as a dark mote, and at least this on a
 * dark one, so it reads as a light one.
 */
const LIGHT_PAGE_MAX_LUMINANCE = 0.16;
const DARK_PAGE_MIN_LUMINANCE = 0.6;
/** Below this luminance a page background counts as dark. */
const DARK_PAGE_LUMINANCE = 0.18;
/** Below this alpha a fill has no colour to shed, so the dust is grey. */
const VISIBLE_FILL_ALPHA = 0.1;

const relativeLuminance = ([red, green, blue]: readonly number[]) =>
  0.2126 * red + 0.7152 * green + 0.0722 * blue;

/**
 * Whether a page background is dark, so dust on it is light.
 *
 * @internal
 */
export function isDarkBackground(background: EffectColor) {
  const linear = background.slice(0, 3).map(toLinear);
  return relativeLuminance(linear) < DARK_PAGE_LUMINANCE;
}

/**
 * The colour of the dust an element sheds, sRGB-encoded: its fill, darkened
 * on a light page or lightened on a dark one until it stands clear of the
 * page. A fill too transparent to see sheds grey dust.
 *
 * @internal
 */
export function dustColor(
  fill: EffectColor,
  dark: boolean,
): readonly [number, number, number] {
  const linear =
    fill[3] < VISIBLE_FILL_ALPHA
      ? [0.5, 0.5, 0.5]
      : fill.slice(0, 3).map(toLinear);
  const luminance = relativeLuminance(linear);
  let shifted = linear;
  if (dark && luminance < DARK_PAGE_MIN_LUMINANCE) {
    const towardWhite = (DARK_PAGE_MIN_LUMINANCE - luminance) / (1 - luminance);
    shifted = linear.map((channel) => channel + (1 - channel) * towardWhite);
  } else if (!dark && luminance > LIGHT_PAGE_MAX_LUMINANCE) {
    const scale = LIGHT_PAGE_MAX_LUMINANCE / luminance;
    shifted = linear.map((channel) => channel * scale);
  }
  const [red, green, blue] = shifted.map(toGamma);
  return [red, green, blue];
}

/**
 * Packs a colour with values from 0 to 1 as four bytes, red in the lowest,
 * the way WGSL's `unpack4x8unorm` reads them.
 *
 * @internal
 */
export function packColor(color: EffectColor) {
  let packed = 0;
  for (const [index, channel] of color.entries()) {
    const byte = Math.round(Math.min(1, Math.max(0, channel)) * 255);
    packed += byte * 2 ** (8 * index);
  }
  return packed;
}
