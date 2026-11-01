/** The wall clock in a time zone: the date as `YYYY-MM-DD`, the hour 0–23, and the weekday, 0 for Sunday. */
export interface LocalClock {
  date: string;
  hour: number;
  weekday: number;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string) {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
      weekday: "short",
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

/** True when `Intl` knows the IANA time zone. */
export function isTimeZone(value: string): boolean {
  try {
    formatterFor(value);
    return true;
  } catch {
    return false;
  }
}

/** Reads the wall clock of `timeZone` at `now`, with its daylight saving time. */
export function localClock(now: Date, timeZone: string): LocalClock {
  const parts = Object.fromEntries(
    formatterFor(timeZone)
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    weekday: WEEKDAYS.indexOf(parts.weekday),
  };
}

/**
 * The local date of the report to build now, or null when none is due. A
 * report is due from the report hour on, until there is one for the day: so
 * a cron run that fails or a skipped hour on a daylight saving day only
 * makes the report later, never skips it.
 */
export function dueReportDate({
  now,
  timeZone,
  reportHour,
  latestReportDate,
}: {
  now: Date;
  timeZone: string;
  reportHour: number;
  /** The local date of the user's newest report. */
  latestReportDate: string | null;
}): string | null {
  const clock = localClock(now, timeZone);
  if (clock.hour < reportHour) return null;
  if (latestReportDate !== null && latestReportDate >= clock.date) return null;
  return clock.date;
}
