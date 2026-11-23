export function sampleCovariance(
  a: readonly number[],
  b: readonly number[],
): number {
  const n = a.length;
  const meanA = a.reduce((sum, value) => sum + value, 0) / n;
  const meanB = b.reduce((sum, value) => sum + value, 0) / n;
  let sum = 0;
  for (let index = 0; index < n; index += 1) {
    sum += (a[index] - meanA) * (b[index] - meanB);
  }
  return sum / (n - 1);
}
