import { addDays } from "./add-days.ts";
import { endOfMonth } from "./start-of-month.ts";
import { startOfWeek, weekdayOf } from "./start-of-week.ts";
import { formatDay } from "./to-epoch-day.ts";

/** One-off changes to the regular England and Wales calendar. */
const EXCEPTIONS: Partial<
  Record<number, { removed: readonly string[]; added: readonly string[] }>
> = {
  2020: { removed: ["2020-05-04"], added: ["2020-05-08"] },
  2022: {
    removed: ["2022-05-30"],
    added: ["2022-06-02", "2022-06-03", "2022-09-19"],
  },
  2023: { removed: [], added: ["2023-05-08"] },
};

/** Easter Sunday by the anonymous Gregorian computus. */
function easterSunday(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return formatDay(year, month, day);
}

function firstMonday(year: number, month: number) {
  return startOfWeek(formatDay(year, month, 7));
}

function lastMonday(year: number, month: number) {
  return startOfWeek(endOfMonth(formatDay(year, month, 1)));
}

/** The day itself, or the Monday after it when it falls on a weekend. */
function mondayIfWeekend(day: string) {
  const weekday = weekdayOf(day);
  return weekday === 6
    ? addDays(day, 2)
    : weekday === 7
      ? addDays(day, 1)
      : day;
}

function regularBankHolidays(year: number) {
  const easter = easterSunday(year);
  const christmas = formatDay(year, 12, 25);
  const christmasWeekday = weekdayOf(christmas);
  const christmasOnWeekend = christmasWeekday >= 6;
  return [
    mondayIfWeekend(formatDay(year, 1, 1)),
    addDays(easter, -2),
    addDays(easter, 1),
    firstMonday(year, 5),
    lastMonday(year, 5),
    lastMonday(year, 8),
    christmasOnWeekend ? formatDay(year, 12, 27) : christmas,
    christmasWeekday === 5 || christmasWeekday === 6
      ? formatDay(year, 12, 28)
      : formatDay(year, 12, 26),
  ];
}

const holidaysByYear = new Map<number, ReadonlySet<string>>();

/** The England and Wales bank holidays of a year, substitute days included. */
export function bankHolidaysOf(year: number): ReadonlySet<string> {
  const cached = holidaysByYear.get(year);
  if (cached) return cached;
  const exceptions = EXCEPTIONS[year];
  const days = new Set(regularBankHolidays(year));
  for (const day of exceptions?.removed ?? []) days.delete(day);
  for (const day of exceptions?.added ?? []) days.add(day);
  holidaysByYear.set(year, days);
  return days;
}
