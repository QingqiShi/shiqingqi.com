import { fromEpochDay, toEpochDay } from "./to-epoch-day.ts";

export function addDays(day: string, days: number): string {
  return fromEpochDay(toEpochDay(day) + days);
}

/** Whole days from `from` to `to`: positive when `to` is later. */
export function daysBetween(from: string, to: string): number {
  return toEpochDay(to) - toEpochDay(from);
}
