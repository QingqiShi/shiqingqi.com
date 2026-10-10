/**
 * The mean of the values whose day falls in the `windowDays` days ending on
 * each point's day, for a trend line such as a 13-week average. `days` is
 * ascending.
 */
export function trailingAverage(
  days: Int32Array,
  values: Float64Array,
  windowDays: number,
): Float64Array {
  const out = new Float64Array(values.length);
  let first = 0;
  let sum = 0;
  for (let point = 0; point < values.length; point++) {
    sum += values[point];
    while (days[first] <= days[point] - windowDays) {
      sum -= values[first];
      first++;
    }
    out[point] = sum / (point - first + 1);
  }
  return out;
}
