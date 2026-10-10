/**
 * The value domain of a chart: the lowest and highest point of every series,
 * with a margin so the line never touches the edge. A flat series gets a
 * band around its value.
 */
export function chartDomain(
  ...series: readonly (Float64Array | null)[]
): [number, number] {
  let low = Infinity;
  let high = -Infinity;
  for (const values of series) {
    if (!values) continue;
    for (const value of values) {
      if (value < low) low = value;
      if (value > high) high = value;
    }
  }
  if (low === Infinity) return [0, 1];
  if (low === high) {
    const pad = Math.max(Math.abs(low) * 0.05, 100);
    return [low - pad, high + pad];
  }
  const pad = (high - low) * 0.08;
  return [low - pad, high + pad];
}
