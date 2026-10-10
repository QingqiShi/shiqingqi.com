import { daysBetween } from "../domain/dates/add-days.ts";
import { displayDay, displayLocale } from "../domain/dates/display-day.ts";

const RECENT_DAYS = 45;
const formatters = new Map<string, Intl.RelativeTimeFormat>();

/** How long ago a balance was last set: "today", "3 days ago", or the day once it is older. */
export function formatValuationAge(
  day: string,
  today: string,
  locale: string,
): string {
  const days = daysBetween(day, today);
  if (days < 0 || days > RECENT_DAYS) {
    return displayDay(
      day,
      locale,
      day.slice(0, 4) === today.slice(0, 4) ? "day" : "dayYear",
    );
  }
  let formatter = formatters.get(locale);
  if (!formatter) {
    formatter = new Intl.RelativeTimeFormat(displayLocale(locale), {
      numeric: "auto",
    });
    formatters.set(locale, formatter);
  }
  return formatter.format(-days, "day");
}
