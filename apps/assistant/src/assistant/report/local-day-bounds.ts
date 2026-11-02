const DAY_MS = 24 * 60 * 60 * 1000;

/** An instant in a day, from start (included) to end (not included). */
export interface DayBounds {
  start: Date;
  end: Date;
}

const offsetFormatters = new Map<string, Intl.DateTimeFormat>();

function offsetFormatterFor(timeZone: string) {
  let formatter = offsetFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    offsetFormatters.set(timeZone, formatter);
  }
  return formatter;
}

/** How far the wall clock of `timeZone` is ahead of UTC at `epochMs`. */
function offsetMs(epochMs: number, timeZone: string): number {
  const parts = Object.fromEntries(
    offsetFormatterFor(timeZone)
      .formatToParts(new Date(epochMs))
      .map((part) => [part.type, Number(part.value)]),
  );
  const wall = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return wall - Math.floor(epochMs / 1000) * 1000;
}

function utcMidnight(localDate: string): number {
  const [year, month, day] = localDate.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function isoDate(epochMs: number): string {
  return new Date(epochMs).toISOString().slice(0, 10);
}

/** The `YYYY-MM-DD` that is `days` after `localDate`; negative goes back. */
export function addDays(localDate: string, days: number): string {
  return isoDate(utcMidnight(localDate) + days * DAY_MS);
}

/** The instant the wall clock of `timeZone` shows midnight at the start of `localDate`. */
function zonedMidnight(localDate: string, timeZone: string): number {
  const wall = utcMidnight(localDate);
  let instant = wall - offsetMs(wall, timeZone);
  instant = wall - offsetMs(instant, timeZone);
  return instant;
}

/** The instants of one local day in `timeZone`: 23, 24 or 25 hours long. */
export function localDayBounds(localDate: string, timeZone: string): DayBounds {
  return {
    start: new Date(zonedMidnight(localDate, timeZone)),
    end: new Date(zonedMidnight(addDays(localDate, 1), timeZone)),
  };
}

export function isInDay(instant: Date, { start, end }: DayBounds): boolean {
  return instant >= start && instant < end;
}
