import { fromEpochDay } from "../domain/dates/to-epoch-day.ts";
import type { Grouping } from "./types.ts";

/** True for a period an axis tick should land on: a January of months, the 1st of days. */
export function isMajorPeriod(
  boundaries: Int32Array,
  index: number,
  grouping: Grouping,
): boolean {
  const day = fromEpochDay(boundaries[index]);
  if (grouping === "month") return day.endsWith("-01-01");
  if (grouping === "day") return day.endsWith("-01");
  return false;
}
