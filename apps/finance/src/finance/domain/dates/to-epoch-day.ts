const DASH = 45;
const ZERO = 48;

function digitsAt(text: string, start: number, count: number): number {
  let value = 0;
  for (let i = start; i < start + count; i++) {
    const digit = text.charCodeAt(i) - ZERO;
    if (!(digit >= 0 && digit <= 9)) return Number.NaN;
    value = value * 10 + digit;
  }
  return value;
}

/** Days from 1970-01-01 to the start of the given civil date (proleptic Gregorian). */
function daysFromCivil(year: number, month: number, day: number): number {
  const y = month <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yearOfEra = y - era * 400;
  const dayOfYear =
    Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1;
  const dayOfEra =
    yearOfEra * 365 +
    Math.floor(yearOfEra / 4) -
    Math.floor(yearOfEra / 100) +
    dayOfYear;
  return era * 146097 + dayOfEra - 719468;
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return leap ? 29 : 28;
  }
  return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31;
}

/** The year, month (1–12) and day of month of a `YYYY-MM-DD` day. Throws when it is not a real date. */
export function parseDay(day: string): {
  year: number;
  month: number;
  dayOfMonth: number;
} {
  if (
    day.length === 10 &&
    day.charCodeAt(4) === DASH &&
    day.charCodeAt(7) === DASH
  ) {
    const year = digitsAt(day, 0, 4);
    const month = digitsAt(day, 5, 2);
    const dayOfMonth = digitsAt(day, 8, 2);
    if (
      !Number.isNaN(year) &&
      month >= 1 &&
      month <= 12 &&
      dayOfMonth >= 1 &&
      dayOfMonth <= daysInMonth(year, month)
    ) {
      return { year, month, dayOfMonth };
    }
  }
  throw new RangeError(`Not a YYYY-MM-DD day: ${day}`);
}

export function isValidDay(day: string): boolean {
  try {
    parseDay(day);
    return true;
  } catch {
    return false;
  }
}

/**
 * The number of days from 1970-01-01 to `day`. Integer days compare and
 * subtract without allocation, so the balance engine works in them.
 */
export function toEpochDay(day: string): number {
  const { year, month, dayOfMonth } = parseDay(day);
  return daysFromCivil(year, month, dayOfMonth);
}

/** Writes a civil date as `YYYY-MM-DD`. */
export function formatDay(
  year: number,
  month: number,
  dayOfMonth: number,
): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(dayOfMonth).padStart(2, "0")}`;
}

/** The `YYYY-MM-DD` day `epochDay` days after 1970-01-01. */
export function fromEpochDay(epochDay: number): string {
  const z = epochDay + 719468;
  const era = Math.floor(z / 146097);
  const dayOfEra = z - era * 146097;
  const yearOfEra = Math.floor(
    (dayOfEra -
      Math.floor(dayOfEra / 1460) +
      Math.floor(dayOfEra / 36524) -
      Math.floor(dayOfEra / 146096)) /
      365,
  );
  const dayOfYear =
    dayOfEra -
    (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
  const mp = Math.floor((5 * dayOfYear + 2) / 153);
  const dayOfMonth = dayOfYear - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp < 10 ? mp + 3 : mp - 9;
  const year = yearOfEra + era * 400 + (month <= 2 ? 1 : 0);
  return formatDay(year, month, dayOfMonth);
}
