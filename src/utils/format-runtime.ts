/**
 * Formats a movie/TV runtime in minutes into a human-readable string
 * with the given hour and minute labels.
 *
 * Returns an empty string for falsy values (0, NaN, etc.)
 * to avoid showing "0m" for entries without runtime data.
 *
 * Omits the minutes portion when it is zero (e.g. 60 → "1h", not "1h 0m").
 *
 * @example formatRuntime(148, "h", "m") → "2h 28m"
 * @example formatRuntime(60, "h", "m")  → "1h"
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
  if (hours > 0 && mins === 0) return `${hours}${hourLabel}`;
  if (hours > 0) return `${hours}${hourLabel} ${mins}${minuteLabel}`;
  return `${mins}${minuteLabel}`;
}
