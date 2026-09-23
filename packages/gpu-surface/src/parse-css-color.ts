export interface Rgba {
  /** sRGB channels as the browser stores them (not linear), 0 to 1. */
  r: number;
  g: number;
  b: number;
  a: number;
}

const NUMBER = String.raw`[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?`;
const ALPHA = String.raw`(?:\s*[,/]\s*(${NUMBER}%?))?`;
const RGB = new RegExp(
  String.raw`^rgba?\(\s*(${NUMBER})\s*,?\s*(${NUMBER})\s*,?\s*(${NUMBER})${ALPHA}\s*\)$`,
  "i",
);
const SRGB = new RegExp(
  String.raw`^color\(\s*srgb\s+(${NUMBER})\s+(${NUMBER})\s+(${NUMBER})${ALPHA}\s*\)$`,
  "i",
);

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function parseAlpha(value: string | undefined) {
  if (value === undefined) return 1;
  return clamp01(
    value.endsWith("%") ? Number.parseFloat(value) / 100 : Number(value),
  );
}

/**
 * Reads a computed CSS colour: `rgb()`, `rgba()`, or `color(srgb …)`. Any
 * other colour space gives `null`, because a conversion here could draw a
 * colour that differs from the one the browser paints.
 */
export function parseCssColor(value: string): Rgba | null {
  const trimmed = value.trim();
  const rgb = RGB.exec(trimmed);
  if (rgb) {
    return {
      r: clamp01(Number(rgb[1]) / 255),
      g: clamp01(Number(rgb[2]) / 255),
      b: clamp01(Number(rgb[3]) / 255),
      a: parseAlpha(rgb[4]),
    };
  }
  const srgb = SRGB.exec(trimmed);
  if (srgb) {
    return {
      r: clamp01(Number(srgb[1])),
      g: clamp01(Number(srgb[2])),
      b: clamp01(Number(srgb[3])),
      a: parseAlpha(srgb[4]),
    };
  }
  return null;
}
