import type { Day, Trip } from "#src/trips/types.ts";
import { TripText } from "./trip-text.tsx";
import { useDayNumber } from "./use-day-number.ts";

/** The title of a day, or "Day N" in the reader's language when it has none. */
export function DayTitle({ trip, day }: { trip: Trip; day: Day }) {
  const dayLabel = useDayNumber(trip);
  return day.title ? (
    <TripText>{day.title}</TripText>
  ) : (
    dayLabel(trip.days.indexOf(day))
  );
}
