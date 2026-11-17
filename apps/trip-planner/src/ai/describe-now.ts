import { dateInZone, minutesInZone } from "#src/reader/resolve-day.ts";
import { dayNumber } from "#src/trips/day-number.ts";
import type { Trip } from "#src/trips/types.ts";

/** The time now on the trip's clock and the day of the trip that it is, for "tonight" and "tomorrow". */
export function describeNow(trip: Trip, now: Date): string {
  const date = dateInZone(now, trip.timeZone);
  const minutes = minutesInZone(now, trip.timeZone);
  const clock = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  const index = trip.days.findIndex((day) => day.date === date);
  const where =
    index >= 0
      ? `That is Day ${String(dayNumber(trip, index))} of the trip (id "${trip.days[index].id}").`
      : date < trip.days[0].date
        ? "The trip has not started yet."
        : date > trip.days[trip.days.length - 1].date
          ? "The trip is over."
          : "No day of the trip is on that date.";
  return `Now it is ${date} ${clock} in ${trip.timeZone}. ${where}`;
}

/** Each day's number, as the person says it, with its id and date. */
export function describeDays(trip: Trip): string {
  return trip.days
    .map(
      (day, i) =>
        `Day ${String(dayNumber(trip, i))}: id "${day.id}", ${day.date}${day.title ? `, ${day.title}` : ""}`,
    )
    .join("\n");
}
