/**
 * Round a number to eliminate floating-point precision artifacts.
 * Uses 12 significant digits which handles common cases like 0.1 + 0.2
 * while preserving precision for most practical calculations.
 */
export function roundResult(value: number): number {
  if (!Number.isFinite(value)) {
    return value;
  }
  // Round to 12 significant digits
  const precision = 12;
  return Number(value.toPrecision(precision));
}
