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
 * The local date of the digest to build now, or null when none is due. A
 * digest is due from the digest hour on, until there is one for the day: so
 * a cron run that fails or a skipped hour on a daylight saving day only
 * makes the digest later, never skips it.
 */
export function dueDigestDate({
  now,
  timeZone,
  digestHour,
  latestDigestDate,
}: {
  now: Date;
  timeZone: string;
  digestHour: number;
  /** The local date of the user's newest digest. */
  latestDigestDate: string | null;
}): string | null {
  const clock = localClock(now, timeZone);
  if (clock.hour < digestHour) return null;
  if (latestDigestDate !== null && latestDigestDate >= clock.date) return null;
  return clock.date;
}
