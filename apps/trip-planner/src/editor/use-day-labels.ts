import { useLocale } from "@tuja/i18n/use-locale";
import { dayDateLabel } from "#src/reader/date-label.ts";
import { useDayNumber } from "#src/reader/use-day-number.ts";
import type { Day } from "#src/trips/types.ts";
import { useEditor } from "./editor-provider.tsx";

/** Names a day of the trip in the editor: "Day 3", and "Day 3 · Sun 19 Apr" with its date. */
export function useDayLabels() {
  const locale = useLocale();
  const { trip } = useEditor();
  const dayNumber = useDayNumber(trip);
  return {
    number: dayNumber,
    byId: (dayId: string) =>
      dayNumber(trip.days.findIndex((day) => day.id === dayId)),
    dated: (day: Day, index: number) =>
      `${dayNumber(index)} · ${dayDateLabel(day.date, locale)}`,
  };
}
