/** Parse a `#rrggbb` or `#rrggbbaa` string into 0-255 RGBA components. */
export function parseHex(
  hex: string,
): readonly [number, number, number, number] {
  const value = hex.startsWith("#") ? hex.slice(1) : hex;
  if (value.length === 6) {
    return [
      parseInt(value.slice(0, 2), 16),
      parseInt(value.slice(2, 4), 16),
      parseInt(value.slice(4, 6), 16),
      255,
    ];
  }
  if (value.length === 8) {
    return [
      parseInt(value.slice(0, 2), 16),
      parseInt(value.slice(2, 4), 16),
      parseInt(value.slice(4, 6), 16),
      parseInt(value.slice(6, 8), 16),
    ];
  }
  return [0, 0, 0, 255];
}
