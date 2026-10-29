import {
  utcDay,
  utcMonday,
  utcMonth,
  utcYear,
  type CountableTimeInterval,
} from "d3-time";
import { MS_PER_DAY } from "../domain/dates/display-day.ts";

export interface DateTick {
  epochDay: number;
  /** What the label shows: a day of a month, a month, or a year. */
  unit: "day" | "month" | "year";
}

interface Candidate {
  interval: CountableTimeInterval;
  /** Every `step`th boundary: from the first for days, at month numbers that `step` divides for months. */
  step: number;
  unit: DateTick["unit"];
}

const CANDIDATES: readonly Candidate[] = [
  { interval: utcDay, step: 1, unit: "day" },
  { interval: utcDay, step: 2, unit: "day" },
  { interval: utcMonday, step: 1, unit: "day" },
  { interval: utcMonday, step: 2, unit: "day" },
  ...[1, 2, 3, 6].map((step) => ({
    interval: utcMonth,
    step,
    unit: "month" as const,
  })),
];

function candidateDates(
  { interval, step, unit }: Candidate,
  from: Date,
  stop: Date,
) {
  if (unit === "day") return interval.range(from, stop, step);
  return interval.every(step)?.range(from, stop) ?? [];
}

function toDate(epochDay: number) {
  return new Date(epochDay * MS_PER_DAY);
}

function toTicks(dates: readonly Date[], unit: DateTick["unit"]): DateTick[] {
  return dates.map((date) => ({
    epochDay: Math.round(date.getTime() / MS_PER_DAY),
    unit:
      unit === "month" && date.getUTCMonth() === 0 && date.getUTCDate() === 1
        ? "year"
        : unit,
  }));
}

function yearTicks(start: Date, stop: Date, limit: number): DateTick[] {
  const span = (stop.getTime() - start.getTime()) / MS_PER_DAY;
  const years = Math.max(Math.ceil(span / 365.25 / (limit - 1)), 1);
  const interval = utcYear.every(years);
  return toTicks(interval ? interval.range(start, stop) : [], "year");
}

/**
 * Calendar boundaries to label on a time axis from `start` to `end` (epoch
 * days), at most `maxTicks`: days for a few weeks (Mondays past a week),
 * months for up to a few years, then years.
 */
export function dateTicks(
  start: number,
  end: number,
  maxTicks: number,
): DateTick[] {
  const limit = Math.max(maxTicks, 2);
  const from = toDate(start);
  const stop = toDate(end + 1);
  for (const candidate of CANDIDATES) {
    if (candidate.interval.count(from, stop) > (limit + 1) * candidate.step) {
      continue;
    }
    const dates = candidateDates(candidate, from, stop);
    if (dates.length <= limit) return toTicks(dates, candidate.unit);
  }
  return yearTicks(from, stop, limit);
}
