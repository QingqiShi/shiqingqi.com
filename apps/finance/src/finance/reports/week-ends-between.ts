import { addDays } from "../domain/dates/add-days.ts";
import { endOfWeek } from "../domain/dates/start-of-week.ts";

/** Every week end from the week that holds `from` to `lastWeekEnd`, oldest first. */
export function weekEndsBetween(from: string, lastWeekEnd: string): string[] {
  const weekEnds: string[] = [];
  for (let day = endOfWeek(from); day <= lastWeekEnd; day = addDays(day, 7)) {
    weekEnds.push(day);
  }
  return weekEnds;
}
