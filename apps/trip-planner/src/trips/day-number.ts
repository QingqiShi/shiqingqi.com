import type { Trip } from "./types.ts";

/** The number that the reader shows for the day at `index` of the trip. */
export function dayNumber(trip: Pick<Trip, "firstDayNumber">, index: number) {
  return index + (trip.firstDayNumber ?? 0);
}
