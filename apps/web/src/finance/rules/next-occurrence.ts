import { addDays, daysBetween } from "../domain/dates/add-days.ts";
import { startOfWeek, weekdayOf } from "../domain/dates/start-of-week.ts";
import {
  daysInMonth,
  formatDay,
  parseDay,
} from "../domain/dates/to-epoch-day.ts";

/** When a Rule happens. Fields left null take their value from `startsOn`. */
export interface RuleSchedule {
  unit: "week" | "month" | "year";
  /** Every how many units. */
  interval: number;
  /** 1–31; a month without that day uses its last day. */
  dayOfMonth: number | null;
  /** ISO weekday, 1 is Monday. */
  weekday: number | null;
  /** 1–12, for yearly Rules. */
  monthOfYear: number | null;
  startsOn: string;
  endsOn: string | null;
}

function clampedDay(year: number, month: number, dayOfMonth: number) {
  return formatDay(year, month, Math.min(dayOfMonth, daysInMonth(year, month)));
}

function weekly(schedule: RuleSchedule, from: string) {
  const weekday = schedule.weekday ?? weekdayOf(schedule.startsOn);
  const first = addDays(startOfWeek(schedule.startsOn), weekday - 1);
  const step = 7 * schedule.interval;
  const steps = Math.max(0, Math.ceil(daysBetween(first, from) / step));
  return addDays(first, steps * step);
}

function monthly(schedule: RuleSchedule, from: string) {
  const start = parseDay(schedule.startsOn);
  const target = parseDay(from);
  const dayOfMonth = schedule.dayOfMonth ?? start.dayOfMonth;
  const startIndex = start.year * 12 + start.month - 1;
  const targetIndex = target.year * 12 + target.month - 1;
  let steps = Math.max(
    0,
    Math.floor((targetIndex - startIndex) / schedule.interval),
  );
  for (;;) {
    const index = startIndex + steps * schedule.interval;
    const year = Math.floor(index / 12);
    const day = clampedDay(year, index - year * 12 + 1, dayOfMonth);
    if (day >= from) return day;
    steps++;
  }
}

function yearly(schedule: RuleSchedule, from: string) {
  const start = parseDay(schedule.startsOn);
  const month = schedule.monthOfYear ?? start.month;
  const dayOfMonth = schedule.dayOfMonth ?? start.dayOfMonth;
  let steps = Math.max(
    0,
    Math.floor((parseDay(from).year - start.year) / schedule.interval),
  );
  for (;;) {
    const day = clampedDay(
      start.year + steps * schedule.interval,
      month,
      dayOfMonth,
    );
    if (day >= from) return day;
    steps++;
  }
}

/**
 * The first day on or after `onOrAfter` (and on or after `startsOn`) on which
 * the Rule happens. It does not look at `endsOn`: the caller stops there.
 */
export function nextOccurrence(schedule: RuleSchedule, onOrAfter: string) {
  const from = onOrAfter > schedule.startsOn ? onOrAfter : schedule.startsOn;
  switch (schedule.unit) {
    case "week": {
      return weekly(schedule, from);
    }
    case "month": {
      return monthly(schedule, from);
    }
    case "year": {
      return yearly(schedule, from);
    }
  }
}

/** Every day from `from` to `to`, both included, on which the Rule happens, up to `endsOn`. */
export function occurrencesBetween(
  schedule: RuleSchedule,
  from: string,
  to: string,
) {
  const days: string[] = [];
  const last =
    schedule.endsOn !== null && schedule.endsOn < to ? schedule.endsOn : to;
  for (
    let day = nextOccurrence(schedule, from);
    day <= last;
    day = nextOccurrence(schedule, addDays(day, 1))
  ) {
    days.push(day);
  }
  return days;
}
