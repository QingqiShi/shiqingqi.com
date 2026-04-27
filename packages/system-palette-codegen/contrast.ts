/**
 * WCAG 2.x contrast helpers used by the palette generator.
 *
 * relativeLuminance: per https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 * contrastRatio: (L1 + 0.05) / (L2 + 0.05), with L1 the lighter of the two
 * pickForeground: choose "#000000" or "#FFFFFF" against a hex background,
 *   preferring whichever yields the higher contrast ratio.
 */

export const FOREGROUND_DARK = "#000000";
export const FOREGROUND_LIGHT = "#FFFFFF";

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

export function contrastRatio(hexA: string, hexB: string): number {
  const lA = relativeLuminance(hexA);
  const lB = relativeLuminance(hexB);
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}

export function pickForeground(backgroundHex: string): string {
  const black = contrastRatio(backgroundHex, FOREGROUND_DARK);
  const white = contrastRatio(backgroundHex, FOREGROUND_LIGHT);
  return black >= white ? FOREGROUND_DARK : FOREGROUND_LIGHT;
}
