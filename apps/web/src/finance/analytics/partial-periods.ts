import { addMonths } from "../domain/dates/add-months.ts";
import {
  endOfMonth,
  startOfMonth,
  startOfYear,
} from "../domain/dates/start-of-month.ts";
import { endOfWeek, startOfWeek } from "../domain/dates/start-of-week.ts";
import { fromEpochDay, toEpochDay } from "../domain/dates/to-epoch-day.ts";
import type { Grouping } from "./types.ts";

function calendarPeriod(day: string, grouping: Grouping) {
  switch (grouping) {
    case "day":
      return { first: day, last: day };
    case "week":
      return { first: startOfWeek(day), last: endOfWeek(day) };
    case "month":
      return { first: startOfMonth(day), last: endOfMonth(day) };
    case "year": {
      const first = startOfYear(day);
      return {
        first,
        last: fromEpochDay(toEpochDay(addMonths(first, 12)) - 1),
      };
    }
  }
}

/**
 * Marks with 1 each period that the range cuts short of its calendar week,
 * month or year, such as this month up to today or a first week that starts
 * on a Wednesday. A day is never cut short.
 */
export function partialPeriods(
  boundaries: Int32Array,
  grouping: Grouping,
): Uint8Array {
  const count = Math.max(boundaries.length - 1, 0);
  const partial = new Uint8Array(count);
  if (grouping === "day") return partial;
  for (const index of new Set([0, count - 1])) {
    if (index < 0) continue;
    const first = fromEpochDay(boundaries[index]);
    const last = fromEpochDay(boundaries[index + 1] - 1);
    const period = calendarPeriod(first, grouping);
    if (period.first !== first || period.last !== last) partial[index] = 1;
  }
  return partial;
}
