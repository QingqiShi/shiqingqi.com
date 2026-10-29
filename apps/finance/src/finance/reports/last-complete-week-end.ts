import { addDays } from "../domain/dates/add-days.ts";
import { startOfWeek } from "../domain/dates/start-of-week.ts";

/** The Sunday of the last week that ended before `today`. */
export function lastCompleteWeekEnd(today: string): string {
  return addDays(startOfWeek(today), -1);
}
