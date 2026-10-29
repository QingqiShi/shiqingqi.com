/** Moves the `k`-th smallest value of `values[left…right]` to position `k`, smaller ones before it. */
function select(values: Float64Array, k: number) {
  let left = 0;
  let right = values.length - 1;
  while (right > left) {
    const pivot = values[(left + right) >> 1];
    let i = left;
    let j = right;
    while (i <= j) {
      while (values[i] < pivot) i++;
      while (values[j] > pivot) j--;
      if (i <= j) {
        const swap = values[i];
        values[i] = values[j];
        values[j] = swap;
        i++;
        j--;
      }
    }
    if (k <= j) right = j;
    else if (k >= i) left = i;
    else return;
  }
}

/** The `q` quantile with linear interpolation; reorders `values`. */
function quantile(values: Float64Array, q: number) {
  const position = (values.length - 1) * q;
  const below = Math.floor(position);
  select(values, below);
  const low = values[below];
  if (below + 1 >= values.length) return low;
  let next = Infinity;
  for (let i = below + 1; i < values.length; i++) {
    if (values[i] < next) next = values[i];
  }
  return low + (next - low) * (position - below);
}

/**
 * The IQR rule: a value is an outlier when it is more than 1.5 times the
 * interquartile range below the first quartile or above the third. Returns
 * the range of values to keep, or null when there are fewer than four
 * values to judge from. It selects the quartiles without a full sort.
 */
export function outlierFences(
  values: ArrayLike<number>,
): { low: number; high: number } | null {
  if (values.length < 4) return null;
  const copy =
    values instanceof Float64Array ? values.slice() : Float64Array.from(values);
  const first = quantile(copy, 0.25);
  const third = quantile(copy, 0.75);
  const spread = (third - first) * 1.5;
  return { low: first - spread, high: third + spread };
}
