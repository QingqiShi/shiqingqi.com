import { fromEpochDay, toEpochDay } from "./to-epoch-day.ts";

/** An ISO weekday: 1 is Monday, 7 is Sunday. */
type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

function weekdayOfEpochDay(epochDay: number): number {
  // 1970-01-01 was a Thursday, ISO weekday 4.
  return ((((epochDay + 3) % 7) + 7) % 7) + 1;
}

export function weekdayOf(day: string): number {
  return weekdayOfEpochDay(toEpochDay(day));
}

/** The first day of the week that holds `day`. Weeks start on Monday unless `weekStartsOn` says otherwise. */
export function startOfWeek(day: string, weekStartsOn: Weekday = 1): string {
  const epochDay = toEpochDay(day);
  const offset = (weekdayOfEpochDay(epochDay) - weekStartsOn + 7) % 7;
  return fromEpochDay(epochDay - offset);
}

/** The last day of the week that holds `day`: the Sunday, for weeks that start on Monday. */
export function endOfWeek(day: string, weekStartsOn: Weekday = 1): string {
  return fromEpochDay(toEpochDay(startOfWeek(day, weekStartsOn)) + 6);
}
