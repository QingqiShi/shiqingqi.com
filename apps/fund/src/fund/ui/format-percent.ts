/**
 * A percentage with one decimal. `signed` writes a plus or a minus sign in
 * front, for a change or a return.
 */
export function formatPercent(
  value: number,
  { signed = false, digits = 1 }: { signed?: boolean; digits?: number } = {},
): string {
  const factor = 10 ** digits;
  const rounded = Math.round(value * factor) / factor;
  const text = `${Math.abs(rounded).toFixed(digits)}%`;
  if (rounded < 0) return `−${text}`;
  return signed && rounded > 0 ? `+${text}` : text;
}
