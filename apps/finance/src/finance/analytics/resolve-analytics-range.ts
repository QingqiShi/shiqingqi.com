import { addDays, daysBetween } from "../domain/dates/add-days.ts";
import { addMonths } from "../domain/dates/add-months.ts";
import {
  endOfMonth,
  startOfMonth,
  startOfYear,
} from "../domain/dates/start-of-month.ts";
import type { Grouping } from "./types.ts";

export const ANALYTICS_RANGES = [
  "thisMonth",
  "lastMonth",
  "3M",
  "12M",
  "YTD",
  "all",
  "custom",
] as const;

export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

export function isAnalyticsRange(value: unknown): value is AnalyticsRange {
  return ANALYTICS_RANGES.some((range) => range === value);
}

export interface ResolvedRange {
  from: string;
  to: string;
  /** The period just before, as long as this one; null for "All". */
  previous: { from: string; to: string } | null;
}

/**
 * The days a range covers on `today`. Month ranges are whole calendar
 * months (this month runs to today), and the previous period is the same
 * stretch one length earlier: last month's first ten days for the first
 * ten days of this month, last year to date for this year to date.
 */
export function resolveAnalyticsRange(
  range: AnalyticsRange,
  today: string,
  options: {
    /** The first day with data, for "All". */
    firstDay: string | null;
    custom?: { from: string | null; to: string | null };
  },
): ResolvedRange {
  const monthsBack = (months: number) => {
    const from = addMonths(startOfMonth(today), -(months - 1));
    return {
      from,
      to: today,
      previous: {
        from: addMonths(from, -months),
        to: addMonths(today, -months),
      },
    };
  };
  switch (range) {
    case "thisMonth":
      return monthsBack(1);
    case "lastMonth": {
      const from = addMonths(startOfMonth(today), -1);
      const previousFrom = addMonths(from, -1);
      return {
        from,
        to: endOfMonth(from),
        previous: { from: previousFrom, to: endOfMonth(previousFrom) },
      };
    }
    case "3M":
      return monthsBack(3);
    case "12M":
      return monthsBack(12);
    case "YTD": {
      const from = startOfYear(today);
      return {
        from,
        to: today,
        previous: { from: addMonths(from, -12), to: addMonths(today, -12) },
      };
    }
    case "all": {
      const first = options.firstDay ?? startOfMonth(today);
      return { from: first < today ? first : today, to: today, previous: null };
    }
    case "custom": {
      let from = options.custom?.from ?? startOfMonth(today);
      let to = options.custom?.to ?? today;
      if (from > to) [from, to] = [to, from];
      const length = daysBetween(from, to) + 1;
      return {
        from,
        to,
        previous: {
          from: addDays(from, -length),
          to: addDays(from, -1),
        },
      };
    }
  }
}

/** The bar length a range reads best in: days for a month, weeks for a quarter, then months, then years. */
export function defaultGrouping(from: string, to: string): Grouping {
  const length = daysBetween(from, to) + 1;
  if (length <= 45) return "day";
  if (length <= 120) return "week";
  if (length <= 6 * 366) return "month";
  return "year";
}
