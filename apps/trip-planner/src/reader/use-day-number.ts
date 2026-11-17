import { t } from "@tuja/i18n";
import { dayNumber } from "#src/trips/day-number.ts";
import type { Trip } from "#src/trips/types.ts";

/** "Day 3", "第 3 天": the name of the day at an index of the trip. */
export function useDayNumber(trip: Pick<Trip, "firstDayNumber">) {
  const dayN = t({ en: "Day {n}", zh: "第 {n} 天" });
  return (index: number) => dayN.replace("{n}", String(dayNumber(trip, index)));
}
