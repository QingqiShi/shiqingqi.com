import { daysInMonth, formatDay, parseDay } from "./to-epoch-day.ts";

/**
 * The same day of the month `months` months later (or earlier, when
 * negative), moved back to the month's last day when that month is shorter:
 * 2026-01-31 plus one month is 2026-02-28.
 */
export function addMonths(day: string, months: number): string {
  const { year, month, dayOfMonth } = parseDay(day);
  const index = year * 12 + (month - 1) + months;
  const nextYear = Math.floor(index / 12);
  const nextMonth = index - nextYear * 12 + 1;
  const nextDay = Math.min(dayOfMonth, daysInMonth(nextYear, nextMonth));
  return formatDay(nextYear, nextMonth, nextDay);
}
