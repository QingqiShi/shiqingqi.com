import { addMonths } from "../domain/dates/add-months.ts";
import { startOfYear } from "../domain/dates/start-of-month.ts";
import type { ChartRange } from "./chart-ranges.ts";

const MONTHS: Record<Exclude<ChartRange, "YTD" | "all">, number> = {
  "1M": 1,
  "3M": 3,
  "6M": 6,
  "1Y": 12,
  "5Y": 60,
};

/**
 * The first day a range shows when it ends on `today`. A range never starts
 * before `firstDay`, the first day with data, so a short history fills the
 * chart instead of a flat line at zero.
 */
export function chartRangeStart(
  range: ChartRange,
  today: string,
  firstDay: string | null,
): string {
  let start: string;
  if (range === "YTD") start = startOfYear(today);
  else if (range === "all") start = firstDay ?? addMonths(today, -1);
  else start = addMonths(today, -MONTHS[range]);
  if (firstDay !== null && start < firstDay) start = firstDay;
  return start > today ? today : start;
}
