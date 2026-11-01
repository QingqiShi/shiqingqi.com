const MINUTE = 60_000;

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterOf(timeZone: string) {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

/** A wall-clock time with no zone. */
export interface LocalTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/** Reads `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm[:ss]`. */
export function parseLocalTime(value: string): LocalTime {
  const [date, time = "00:00"] = value.split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute, second = 0] = time.split(":").map(Number);
  return { year, month, day, hour, minute, second };
}

function asUtc(local: LocalTime) {
  return Date.UTC(
    local.year,
    local.month - 1,
    local.day,
    local.hour,
    local.minute,
    local.second,
  );
}

function fromUtc(epoch: number): LocalTime {
  const date = new Date(epoch);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
  };
}

/** The wall-clock time in `timeZone` at an instant. */
export function localTimeAt(epoch: number, timeZone: string): LocalTime {
  const parts = formatterOf(timeZone).formatToParts(new Date(epoch));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((entry) => entry.type === type)?.value ?? 0);
  return {
    year: part("year"),
    month: part("month"),
    day: part("day"),
    hour: part("hour"),
    minute: part("minute"),
    second: part("second"),
  };
}

/** Minutes east of UTC in `timeZone` at an instant. */
export function offsetMinutesAt(epoch: number, timeZone: string) {
  const whole = Math.floor(epoch / 1000) * 1000;
  return Math.round((asUtc(localTimeAt(whole, timeZone)) - whole) / MINUTE);
}

/**
 * The instant of a wall-clock time in `timeZone`. A time that a clock
 * change skips is read with the offset from before the change.
 */
export function instantOf(local: LocalTime, timeZone: string): number {
  const guess = asUtc(local);
  const first = guess - offsetMinutesAt(guess, timeZone) * MINUTE;
  return guess - offsetMinutesAt(first, timeZone) * MINUTE;
}

/** Adds minutes to a wall-clock time, as a clock on the wall would. */
export function addMinutes(local: LocalTime, minutes: number): LocalTime {
  return fromUtc(asUtc(local) + minutes * MINUTE);
}

export function addDays(local: LocalTime, days: number): LocalTime {
  return addMinutes(local, days * 24 * 60);
}

function pad(value: number, length = 2) {
  return String(value).padStart(length, "0");
}

/** `YYYYMMDD`. */
export function formatIcsDate(local: LocalTime) {
  return `${pad(local.year, 4)}${pad(local.month)}${pad(local.day)}`;
}

/** `YYYYMMDDTHHMMSS`, a local time. */
export function formatIcsLocalTime(local: LocalTime) {
  return `${formatIcsDate(local)}T${pad(local.hour)}${pad(local.minute)}${pad(local.second)}`;
}

/** `YYYYMMDDTHHMMSSZ`. */
export function formatIcsUtc(epoch: number) {
  return `${formatIcsLocalTime(fromUtc(epoch))}Z`;
}

export function isTimeZone(timeZone: string) {
  try {
    formatterOf(timeZone);
    return true;
  } catch {
    return false;
  }
}
