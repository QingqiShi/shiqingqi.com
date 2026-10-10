/** The most common value; on a tie, the one that reached the top count first. */
export function modeOf(values: readonly string[]): string | undefined {
  const counts = new Map<string, number>();
  let best: string | undefined;
  let bestCount = 0;
  for (const value of values) {
    const count = (counts.get(value) ?? 0) + 1;
    counts.set(value, count);
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}
