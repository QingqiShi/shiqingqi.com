/**
 * Formats a movie/TV runtime in minutes into a human-readable string
 * with the given hour and minute labels.
 *
 * Returns an empty string for falsy values (0, NaN, etc.)
 * to avoid showing "0m" for entries without runtime data.
 *
 * @example formatRuntime(148, "h", "m") → "2h 28m"
 * @example formatRuntime(45, "h", "m")  → "45m"
 */
export function formatRuntime(
  minutes: number,
  hourLabel: string,
  minuteLabel: string,
) {
  if (!minutes) return "";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours > 0 ? `${hours}${hourLabel} ` : ""}${mins}${minuteLabel}`;
}
