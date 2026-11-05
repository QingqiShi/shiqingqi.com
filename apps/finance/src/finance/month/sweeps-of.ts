/**
 * The share of the ring of each of `values`, in proportion to its value,
 * but at least `minimum` for each value above 0. The shares of a ring with
 * any value add up to 1.
 */
export function sweepsOf(values: readonly number[], minimum: number) {
  const positive = values.filter((value) => value > 0).length;
  const total = values.reduce((sum, value) => sum + Math.max(value, 0), 0);
  if (total === 0) return values.map(() => 0);
  if (positive * minimum >= 1) {
    return values.map((value) => Math.max(value, 0) / total);
  }
  const atMinimum = new Set<number>();
  for (;;) {
    let free = 0;
    for (const [at, value] of values.entries()) {
      if (value > 0 && !atMinimum.has(at)) free += value;
    }
    const room = 1 - atMinimum.size * minimum;
    const sweeps = values.map((value, at) => {
      if (value <= 0) return 0;
      return atMinimum.has(at) ? minimum : (value / free) * room;
    });
    const short = sweeps.flatMap((sweep, at) =>
      sweep > 0 && sweep < minimum && !atMinimum.has(at) ? [at] : [],
    );
    if (short.length === 0) return sweeps;
    for (const at of short) atMinimum.add(at);
  }
}
