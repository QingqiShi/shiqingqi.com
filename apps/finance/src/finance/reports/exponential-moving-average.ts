/**
 * The exponential moving average of `values` over `periods`, with the
 * weight 2 / (periods + 1) that a spreadsheet trend uses. It starts at the
 * first value, so it depends only on the values up to each point.
 */
export function exponentialMovingAverage(
  values: readonly number[],
  periods: number,
): number[] {
  const weight = 2 / (periods + 1);
  const averages: number[] = [];
  let average = values.at(0) ?? 0;
  for (const value of values) {
    average += weight * (value - average);
    averages.push(average);
  }
  return averages;
}
