/**
 * Formats a movie/TV runtime in minutes into a locale-aware, human-readable
 * string using `Intl.DurationFormat`.
 *
 * Returns an empty string for falsy values (0, NaN, etc.)
 * to avoid showing "0m" for entries without runtime data.
 *
 * Omits the minutes portion when it is zero (e.g. 60 → "1h", not "1h 0m").
 *
 * @example formatRuntime(148, "en") → "2h 28m"
 * @example formatRuntime(60, "en")  → "1h"
 * @example formatRuntime(45, "en")  → "45m"
 * @example formatRuntime(148, "zh") → "2小时28分钟"
 */
export function formatRuntime(minutes: number, locale: string) {
  if (!minutes) return "";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const duration: Intl.DurationInput =
    hours > 0 && mins > 0
      ? { hours, minutes: mins }
      : hours > 0
        ? { hours }
        : { minutes: mins };
  return new Intl.DurationFormat(locale, { style: "narrow" }).format(duration);
}
