/** The index of the first of `values` (ascending) above `value`, or `values.length`. */
export function upperBound(values: ArrayLike<number>, value: number): number {
  let low = 0;
  let high = values.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (values[middle] <= value) low = middle + 1;
    else high = middle;
  }
  return low;
}
