import { fromEpochDay, toEpochDay } from "./to-epoch-day.ts";

/** The ISO weekday of an epoch day: 1 is Monday. */
export function weekdayOfEpochDay(epochDay: number): number {
  // 1970-01-01 was a Thursday, ISO weekday 4.
  return ((((epochDay + 3) % 7) + 7) % 7) + 1;
}

export function weekdayOf(day: string): number {
  return weekdayOfEpochDay(toEpochDay(day));
}

/** The Monday of the week that holds `day`. */
export function startOfWeek(day: string): string {
  const epochDay = toEpochDay(day);
  return fromEpochDay(epochDay - weekdayOfEpochDay(epochDay) + 1);
}

/** The Sunday of the week that holds `day`. */
export function endOfWeek(day: string): string {
  return fromEpochDay(toEpochDay(startOfWeek(day)) + 6);
}
