import { addDays } from "./local-day-bounds.ts";

/**
 * How a to-do comes back. It holds the day the owner asked for, never a date
 * that a short month made of it, so that the 31st returns after a short month.
 * `every` is how many days, weeks, months or years lie between occurrences.
 */
export type RepeatRule =
  | { kind: "daily"; every: number }
  /** `weekdays` runs from 1 for Monday to 7 for Sunday, in order. */
  | { kind: "weekly"; every: number; weekdays: readonly number[] }
  | { kind: "monthly"; every: number; day: number | "last" }
  /** `month` runs from 1 to 12. */
  | { kind: "yearly"; every: number; month: number; day: number }
  | { kind: "after-done"; days: number };

interface OccurrenceDates {
  dueDate: string | null;
  startDate: string | null;
}

const DAY_MS = 86_400_000;

function epochOf(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

/** The weekday of a `YYYY-MM-DD`, from 1 for Monday to 7 for Sunday. */
export function isoWeekday(date: string) {
  return new Date(epochOf(date)).getUTCDay() || 7;
}

/** The `YYYY-MM-DD` of a day in a month that counts from year 0, moved back to the month's last day when it has fewer days. */
function dayOfMonth(monthCount: number, day: number | "last") {
  const year = Math.floor(monthCount / 12);
  const month = monthCount % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const shown = day === "last" ? lastDay : Math.min(day, lastDay);
  return new Date(Date.UTC(year, month, shown)).toISOString().slice(0, 10);
}

function monthCountOf(date: string) {
  const [year, month] = date.split("-").map(Number);
  return year * 12 + month - 1;
}

/**
 * The first day of the rule after `date`. The intervals count from `date`:
 * its week, month or year is the first that can hold the occurrence.
 */
function occurrenceAfter(
  rule: Exclude<RepeatRule, { kind: "after-done" }>,
  date: string,
): string {
  switch (rule.kind) {
    case "daily":
      return addDays(date, rule.every);
    case "weekly": {
      const weekday = isoWeekday(date);
      const later = rule.weekdays.find((day) => day > weekday);
      return later === undefined
        ? addDays(date, 7 * rule.every + rule.weekdays[0] - weekday)
        : addDays(date, later - weekday);
    }
    case "monthly": {
      const month = monthCountOf(date);
      const inMonth = dayOfMonth(month, rule.day);
      return inMonth > date
        ? inMonth
        : dayOfMonth(month + rule.every, rule.day);
    }
    case "yearly": {
      const year = Number(date.slice(0, 4));
      const inYear = dayOfMonth(year * 12 + rule.month - 1, rule.day);
      return inYear > date
        ? inYear
        : dayOfMonth((year + rule.every) * 12 + rule.month - 1, rule.day);
    }
  }
}

/**
 * The due date after this occurrence. It is after both the occurrence's date
 * and the day it was done, so a to-do done late does not come back overdue,
 * and one done early does not come back for the same occurrence.
 */
export function nextOccurrence(
  rule: RepeatRule,
  { dueDate, doneOn }: { dueDate: string | null; doneOn: string },
): string {
  if (rule.kind === "after-done") return addDays(doneOn, rule.days);
  let next = occurrenceAfter(rule, dueDate ?? doneOn);
  while (next <= doneOn) next = occurrenceAfter(rule, next);
  return next;
}

/** The dates of the occurrence after this one. The start date stays as far before the due date. */
export function nextOccurrenceDates(
  rule: RepeatRule,
  { dueDate, startDate }: OccurrenceDates,
  doneOn: string,
): { dueDate: string; startDate: string | null } {
  const next = nextOccurrence(rule, { dueDate, doneOn });
  return {
    dueDate: next,
    startDate:
      dueDate !== null && startDate !== null
        ? addDays(next, (epochOf(startDate) - epochOf(dueDate)) / DAY_MS)
        : null,
  };
}

/**
 * The first day of the rule from `today` on, for a to-do that has no date yet.
 * Null when the rule needs no date, because it counts from the day it is done.
 */
export function firstOccurrence(
  rule: RepeatRule,
  today: string,
): string | null {
  return rule.kind === "after-done"
    ? null
    : occurrenceAfter({ ...rule, every: 1 }, addDays(today, -1));
}

/** The `MM-DD` of a yearly rule. */
export function yearlyMonthDay({
  month,
  day,
}: Extract<RepeatRule, { kind: "yearly" }>) {
  return `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function sameRepeatRule(a: RepeatRule | null, b: RepeatRule | null) {
  const normal = (rule: RepeatRule | null) =>
    JSON.stringify(rule && Object.entries(rule).toSorted());
  return normal(a) === normal(b);
}

const WEEKDAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

/** The rule in words, for the report agent. */
export function repeatRuleText(rule: RepeatRule): string {
  const every = (unit: string, count: number) =>
    count === 1 ? `every ${unit}` : `every ${String(count)} ${unit}s`;
  switch (rule.kind) {
    case "daily":
      return every("day", rule.every);
    case "weekly":
      return `${every("week", rule.every)} on ${rule.weekdays.map((day) => WEEKDAY_NAMES[day - 1]).join(", ")}`;
    case "monthly":
      return `${every("month", rule.every)} on ${rule.day === "last" ? "the last day" : `day ${String(rule.day)}`}`;
    case "yearly":
      return `${every("year", rule.every)} on ${yearlyMonthDay(rule)}`;
    case "after-done":
      return `${String(rule.days)} days after it is done`;
  }
}
