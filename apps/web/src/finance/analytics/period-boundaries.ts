import { startOfWeek } from "../domain/dates/start-of-week.ts";
import {
  formatDay,
  parseDay,
  toEpochDay,
} from "../domain/dates/to-epoch-day.ts";
import type { Grouping } from "./types.ts";

/**
 * Splits `[from, to]` into calendar periods: days, weeks from Monday,
 * months or years. Returns each period's first day as an epoch day, then
 * the day after the last period. The first and last period are cut to the
 * range, so a range that starts on a Wednesday has a short first week.
 */
export function periodBoundaries(
  from: string,
  to: string,
  grouping: Grouping,
): Int32Array {
  const first = toEpochDay(from);
  const end = toEpochDay(to) + 1;
  const starts: number[] = [];
  if (grouping === "day" || grouping === "week") {
    const step = grouping === "day" ? 1 : 7;
    let next =
      grouping === "day" ? first + 1 : toEpochDay(startOfWeek(from)) + 7;
    starts.push(first);
    for (; next < end; next += step) starts.push(next);
  } else {
    const { year, month } = parseDay(from);
    starts.push(first);
    let index =
      grouping === "month" ? year * 12 + month + 1 : (year + 1) * 12 + 1;
    const stride = grouping === "month" ? 1 : 12;
    for (;;) {
      const nextYear = Math.floor((index - 1) / 12);
      const next = toEpochDay(formatDay(nextYear, index - nextYear * 12, 1));
      if (next >= end) break;
      starts.push(next);
      index += stride;
    }
  }
  if (first >= end) starts.length = 0;
  const boundaries = new Int32Array(starts.length + 1);
  boundaries.set(starts);
  boundaries[starts.length] = end;
  return boundaries;
}
