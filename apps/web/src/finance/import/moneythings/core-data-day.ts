import { todayInTimeZone } from "../../domain/dates/today-in-time-zone.ts";

const CORE_DATA_EPOCH_MS = Date.UTC(2001, 0, 1);

/** A Core Data timestamp (seconds since 2001-01-01T00:00:00Z) as a `Date`. */
function coreDataToDate(seconds: number): Date {
  return new Date(CORE_DATA_EPOCH_MS + seconds * 1000);
}

/** A `Date` as a Core Data timestamp. */
export function dateToCoreData(date: Date): number {
  return (date.getTime() - CORE_DATA_EPOCH_MS) / 1000;
}

/** The calendar day in `timeZone` of a Core Data timestamp. */
export function coreDataDay(seconds: number, timeZone: string): string {
  return todayInTimeZone(timeZone, coreDataToDate(seconds));
}

/** MoneyThings writes 1970-01-01T00:00:00Z to mean "from the start". */
export function isSinceTheStart(seconds: number): boolean {
  return coreDataToDate(seconds).getTime() <= 0;
}
