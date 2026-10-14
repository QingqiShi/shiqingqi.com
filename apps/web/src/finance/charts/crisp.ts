/** A pixel position moved to the middle of its pixel, so a 1px line draws sharp. */
export function crisp(value: number): number {
  return Math.round(value) + 0.5;
}
