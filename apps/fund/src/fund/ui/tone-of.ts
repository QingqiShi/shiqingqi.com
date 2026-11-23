/**
 * The colour a profit, a loss or nothing takes. It follows the figure as
 * shown with `digits` decimals, so a figure that shows as zero is neutral.
 */
export function toneOf(
  value: number,
  digits: number,
): "success" | "destructive" | "default" {
  const factor = 10 ** digits;
  const rounded = Math.round(value * factor) / factor;
  if (rounded > 0) return "success";
  if (rounded < 0) return "destructive";
  return "default";
}
