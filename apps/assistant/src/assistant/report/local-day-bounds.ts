const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** A stretch of time, from start (included) to end (not included). */
export interface TimeBounds {
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

/**
 * The first instant the wall clock of `timeZone` shows `hour` on `localDate`.
 * When the clocks go back over that hour, this is the first of the two times.
 * When the clocks skip it, this is the instant they jump.
 */
function zonedHour(localDate: string, hour: number, timeZone: string): number {
  const wall = utcMidnight(localDate) + hour * HOUR_MS;
  const [earlier, later] = [wall - DAY_MS, wall + DAY_MS]
    .map((around) => wall - offsetMs(around, timeZone))
    .sort((a, b) => a - b);
  return (
    [earlier, later].find(
      (instant) => instant + offsetMs(instant, timeZone) === wall,
    ) ?? later
  );
}

/** The instants of one local day in `timeZone`: 23, 24 or 25 hours long. */
export function localDayBounds(
  localDate: string,
  timeZone: string,
): TimeBounds {
  return {
    start: new Date(zonedHour(localDate, 0, timeZone)),
    end: new Date(zonedHour(addDays(localDate, 1), 0, timeZone)),
  };
}

/**
 * The mail that the report of `localDate` covers: from `reportHour` on the
 * day before up to `reportHour` on `localDate`, on the wall clock of
 * `timeZone`. It never depends on when the report is built, so the reports
 * of two days in a row meet exactly. A report is never due before its end
 * (see `dueReportDate`).
 */
export function reportMailWindow(
  localDate: string,
  reportHour: number,
  timeZone: string,
): TimeBounds {
  return {
    start: new Date(zonedHour(addDays(localDate, -1), reportHour, timeZone)),
    end: new Date(zonedHour(localDate, reportHour, timeZone)),
  };
}

/** A window's start and end as the owner's wall clock reads them, `YYYY-MM-DD HH:mm`. */
export interface WindowLabels {
  start: string;
  end: string;
}

function wallClockLabel(instant: Date, timeZone: string) {
  const epochMs = instant.getTime();
  return new Date(epochMs + offsetMs(epochMs, timeZone))
    .toISOString()
    .slice(0, 16)
    .replace("T", " ");
}

/** The labels of any stretch of time, to the minute. */
export function wallClockLabels(
  { start, end }: TimeBounds,
  timeZone: string,
): WindowLabels {
  return {
    start: wallClockLabel(start, timeZone),
    end: wallClockLabel(end, timeZone),
  };
}

export function isInBounds(instant: Date, { start, end }: TimeBounds): boolean {
  return instant >= start && instant < end;
}
