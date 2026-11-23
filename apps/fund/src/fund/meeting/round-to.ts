/** `value` with at most `digits` decimals, or null. Packs stay short this way. */
export function roundTo(
  value: number | null | undefined,
  digits = 2,
): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}
