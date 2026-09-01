import { parseHex } from "#src/utils/parse-hex.ts";

interface RgbaPixel {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Parse an opaque `#rrggbb` colour, or `null` when the string is not one. */
export function hexToRgba(hex: string): RgbaPixel | null {
  if (hex.length !== 7) return null;
  const [r, g, b, a] = parseHex(hex);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
  return { r, g, b, a };
}
