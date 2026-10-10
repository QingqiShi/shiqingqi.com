const formatters = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string) {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

/**
 * The calendar day it is in `timeZone` at `now`, as `YYYY-MM-DD`. The client
 * and the server both call this with the household's time zone, so they agree
 * on "today" whatever zone each one runs in.
 */
export function todayInTimeZone(timeZone: string, now = new Date()): string {
  const parts = getFormatter(timeZone).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year").padStart(4, "0")}-${part("month")}-${part("day")}`;
}
