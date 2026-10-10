import { addDays } from "../domain/dates/add-days.ts";
import { addMonths } from "../domain/dates/add-months.ts";
import { startOfWeek } from "../domain/dates/start-of-week.ts";
import { fromEpochDay, toEpochDay } from "../domain/dates/to-epoch-day.ts";

export interface DateTick {
  epochDay: number;
  /** What the label shows: a day of a month, a month, or a year. */
  unit: "day" | "month" | "year";
}

const MONTH_STEPS = [1, 2, 3, 6];
const DAY_STEPS = [1, 7, 14];

function monthTicks(start: string, end: string, step: number): DateTick[] {
  const ticks: DateTick[] = [];
  let month = `${start.slice(0, 7)}-01`;
  if (month < start) month = addMonths(month, 1);
  while (Number(month.slice(5, 7)) % step !== 1 % step) {
    month = addMonths(month, 1);
  }
  for (; month <= end; month = addMonths(month, step)) {
    ticks.push({
      epochDay: toEpochDay(month),
      unit: month.endsWith("-01-01") ? "year" : "month",
    });
  }
  return ticks;
}

/**
 * Calendar boundaries to label on a time axis from `start` to `end` (epoch
 * days), at most `maxTicks`: days for a few weeks, months for up to a few
 * years, then years.
 */
export function dateTicks(
  start: number,
  end: number,
  maxTicks: number,
): DateTick[] {
  const limit = Math.max(maxTicks, 2);
  const first = fromEpochDay(start);
  const last = fromEpochDay(end);
  const span = end - start;

  for (const step of DAY_STEPS) {
    if (span / step + 1 > limit) continue;
    const ticks: DateTick[] = [];
    let day = step === 1 ? first : startOfWeek(first);
    if (day < first) day = addDays(day, 7);
    for (; day <= last; day = addDays(day, step)) {
      ticks.push({ epochDay: toEpochDay(day), unit: "day" });
    }
    return ticks;
  }

  for (const step of MONTH_STEPS) {
    if (span / (30.44 * step) + 1 > limit) continue;
    return monthTicks(first, last, step);
  }

  const years = Math.ceil(span / 365.25 / (limit - 1));
  const ticks: DateTick[] = [];
  let year = Number(first.slice(0, 4)) + (first.endsWith("-01-01") ? 0 : 1);
  year = Math.ceil(year / years) * years;
  for (; `${String(year)}-01-01` <= last; year += years) {
    ticks.push({ epochDay: toEpochDay(`${String(year)}-01-01`), unit: "year" });
  }
  return ticks;
}
