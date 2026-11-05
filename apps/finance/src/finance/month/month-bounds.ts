import type { AnalyticsIndex } from "../analytics/types.ts";
import { addDays } from "../domain/dates/add-days.ts";
import { addMonths } from "../domain/dates/add-months.ts";
import { fromEpochDay, isValidDay } from "../domain/dates/to-epoch-day.ts";

/** A calendar month as `YYYY-MM`. Two months compare as strings. */
export type MonthKey = string;

/** The month of a `YYYY-MM-DD` day. */
const monthOfDay = (day: string): MonthKey => day.slice(0, 7);

export function addMonthKey(month: MonthKey, months: number): MonthKey {
  return monthOfDay(addMonths(`${month}-01`, months));
}

/** The first and the last day of `month`, as `YYYY-MM-DD`. */
export function monthDays(month: MonthKey) {
  const from = `${month}-01`;
  return { from, to: addDays(addMonths(from, 1), -1) };
}

export interface MonthBounds {
  /** The month of the first Transaction, or `last` when there is none. */
  first: MonthKey;
  /** The Household's current month. */
  last: MonthKey;
}

/** The months the Month screen can show: from the first Transaction to the current month. */
export function monthBounds(
  firstDay: AnalyticsIndex["firstDay"],
  today: string,
): MonthBounds {
  const last = monthOfDay(today);
  if (firstDay === null) return { first: last, last };
  const first = monthOfDay(fromEpochDay(firstDay));
  return { first: first < last ? first : last, last };
}

/** The month that `param` asks for, inside `bounds`; the current month when it asks for none. */
export function resolveMonth(
  param: string | null,
  bounds: MonthBounds,
): MonthKey {
  if (param?.length !== 7 || !isValidDay(`${param}-01`)) return bounds.last;
  if (param < bounds.first) return bounds.first;
  if (param > bounds.last) return bounds.last;
  return param;
}
