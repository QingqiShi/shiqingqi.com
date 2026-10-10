/** Maps a value in `[d0, d1]` to a position in `[r0, r1]`; a flat domain maps to the middle. */
export function linearScale(d0: number, d1: number, r0: number, r1: number) {
  if (d1 === d0) {
    const middle = (r0 + r1) / 2;
    return () => middle;
  }
  const k = (r1 - r0) / (d1 - d0);
  return (value: number) => r0 + (value - d0) * k;
}
