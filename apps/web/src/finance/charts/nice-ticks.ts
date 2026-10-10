const STEPS = [1, 2, 2.5, 5, 10];

/**
 * Round values from `min` to `max` for gridlines, at most `count` of them,
 * with a step of 1, 2, 2.5 or 5 times a power of ten. Values are minor units,
 * so a step is a round amount in the major unit too.
 */
export function niceTicks(min: number, max: number, count: number): number[] {
  if (!(max > min) || count < 2) return [min];
  const rough = (max - min) / (count - 1);
  const power = 10 ** Math.floor(Math.log10(rough));
  let step = power * 10;
  for (const candidate of STEPS) {
    const size = candidate * power;
    if (Math.floor(max / size) - Math.ceil(min / size) + 1 <= count) {
      step = size;
      break;
    }
  }
  const ticks: number[] = [];
  for (let tick = Math.ceil(min / step) * step; tick <= max; tick += step) {
    ticks.push(Math.round(tick) || 0);
  }
  return ticks;
}
