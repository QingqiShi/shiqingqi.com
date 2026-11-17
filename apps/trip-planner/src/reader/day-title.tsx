import type { Day } from "#src/trips/types.ts";
import { TripText } from "./trip-text.tsx";
import { useDayNumber } from "./use-day-number.ts";

/** The title of a day, or "Day N" in the reader's language when it has none. */
export function DayTitle({ day, index }: { day: Day; index: number }) {
  const dayNumber = useDayNumber();
  return day.title ? <TripText>{day.title}</TripText> : dayNumber(index);
}
