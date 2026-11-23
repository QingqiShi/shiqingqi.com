/**
 * Round values for the gridlines of an axis from `min` to `max`, about
 * `count` of them, a step of 1, 2, 2.5 or 5 times a power of ten apart.
 */
export function niceTicks(
  min: number,
  max: number,
  count: number,
): { ticks: number[]; low: number; high: number } {
  const span = max - min || Math.abs(max) || 1;
  const rough = span / Math.max(count - 1, 1);
  const power = 10 ** Math.floor(Math.log10(rough));
  const step =
    [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= rough) ??
    10 * power;
  const low = Math.floor(min / step) * step;
  const high = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let value = low; value <= high + step / 2; value += step) {
    ticks.push(Math.round(value * 1e6) / 1e6);
  }
  return { ticks, low, high: high === low ? low + step : high };
}
