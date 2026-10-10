/**
 * Rounds each value to a whole number so that the rounded values add up to
 * `total` exactly (largest remainder): every value is floored, then the
 * values with the largest fractions take one more until the sum is `total`.
 */
export function allocateRounded(
  values: readonly number[],
  total: number,
): number[] {
  const rounded = values.map((value) => Math.floor(value));
  if (rounded.length === 0) return rounded;
  const byFraction = values
    .map((value, index) => ({ index, fraction: value - rounded[index] }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index)
    .map(({ index }) => index);
  let missing = total - rounded.reduce((sum, value) => sum + value, 0);
  for (let i = 0; missing > 0; i++, missing--) {
    rounded[byFraction[i % byFraction.length]] += 1;
  }
  for (let i = 0; missing < 0; i++, missing++) {
    rounded[byFraction[byFraction.length - 1 - (i % byFraction.length)]] -= 1;
  }
  return rounded.map((value) => value || 0);
}
