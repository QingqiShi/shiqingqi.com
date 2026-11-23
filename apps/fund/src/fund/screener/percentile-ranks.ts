/**
 * The percentile of each value among the values that are not null: 0 for
 * the worst, 100 for the best, the average rank for ties, and 50 when only
 * one value is present. A null value has no percentile.
 */
export function percentileRanks(
  values: readonly (number | null)[],
  better: "higher" | "lower",
): (number | null)[] {
  const present = values
    .map((value, index) => ({ value, index }))
    .filter(
      (entry): entry is { value: number; index: number } =>
        entry.value !== null,
    )
    .sort((a, b) => {
      const order = a.value < b.value ? -1 : a.value > b.value ? 1 : 0;
      return better === "higher" ? order : -order;
    });
  const ranks: (number | null)[] = values.map(() => null);
  if (present.length === 1) {
    ranks[present[0].index] = 50;
    return ranks;
  }
  let start = 0;
  while (start < present.length) {
    let end = start;
    while (
      end + 1 < present.length &&
      present[end + 1].value === present[start].value
    ) {
      end += 1;
    }
    const percentile = (((start + end) / 2) * 100) / (present.length - 1);
    for (let at = start; at <= end; at += 1) {
      ranks[present[at].index] = percentile;
    }
    start = end + 1;
  }
  return ranks;
}
