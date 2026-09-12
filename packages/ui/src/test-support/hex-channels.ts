/** The three 8-bit channels of a `#RRGGBB` string. @internal */
export function hexChannels(hex: string): [number, number, number] {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((i) =>
    Number.parseInt(hex.slice(i, i + 2), 16),
  );
  return [r, g, b];
}
