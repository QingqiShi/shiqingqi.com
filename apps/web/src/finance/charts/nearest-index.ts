/** The index of the point nearest to `x`; `xs` is ascending. */
export function nearestIndex(xs: Float64Array, x: number): number {
  if (xs.length === 0) return -1;
  let low = 0;
  let high = xs.length - 1;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (xs[middle] < x) low = middle + 1;
    else high = middle;
  }
  if (low > 0 && x - xs[low - 1] < xs[low] - x) return low - 1;
  return low;
}
