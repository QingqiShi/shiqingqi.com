/** Clamps a value to a 0-100 share of `max`, for a meter's track fill. */
export function toPercent(value: number, max: number) {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, (value / max) * 100));
}
