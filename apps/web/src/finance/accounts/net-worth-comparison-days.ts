import { addDays } from "../domain/dates/add-days.ts";
import { startOfYear } from "../domain/dates/start-of-month.ts";

/**
 * The days today's net worth is compared with: a week ago, and the end of
 * 31 December, the same as the weekly Report's "since 1 Jan".
 */
export function netWorthComparisonDays(today: string) {
  return {
    lastWeek: addDays(today, -7),
    yearStart: addDays(startOfYear(today), -1),
  };
}
