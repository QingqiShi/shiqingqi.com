/**
 * WCAG 2.x relative luminance of an `#RRGGBB` colour, per
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */

function parseHexChannel(hex: string, start: number): number {
  return Number.parseInt(hex.slice(start, start + 2), 16);
}

function srgbChannelToLinear(value8Bit: number): number {
  const v = value8Bit / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const normalized = hex.startsWith("#") ? hex.slice(1) : hex;
  if (normalized.length !== 6) {
    throw new Error(`relativeLuminance expects #RRGGBB, got "${hex}"`);
  }
  const r = srgbChannelToLinear(parseHexChannel(normalized, 0));
  const g = srgbChannelToLinear(parseHexChannel(normalized, 2));
  const b = srgbChannelToLinear(parseHexChannel(normalized, 4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
