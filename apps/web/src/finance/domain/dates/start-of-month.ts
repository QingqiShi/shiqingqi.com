import { daysInMonth, parseDay } from "./to-epoch-day.ts";

/** The first day of the day's month: the key `month_totals` uses. */
export function startOfMonth(day: string): string {
  return `${day.slice(0, 7)}-01`;
}

export function endOfMonth(day: string): string {
  const { year, month } = parseDay(day);
  return `${day.slice(0, 7)}-${String(daysInMonth(year, month))}`;
}

export function startOfYear(day: string): string {
  parseDay(day);
  return `${day.slice(0, 4)}-01-01`;
}
