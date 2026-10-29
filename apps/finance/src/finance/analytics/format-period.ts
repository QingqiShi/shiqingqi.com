import { displayDay } from "../domain/dates/display-day.ts";
import { fromEpochDay } from "../domain/dates/to-epoch-day.ts";
import type { Grouping } from "./types.ts";

/**
 * Names period `index` of `boundaries`: in short for an axis tick ("Oct",
 * or the year on a January), in full for a readout or a table row.
 */
export function formatPeriod(
  boundaries: Int32Array,
  index: number,
  grouping: Grouping,
  locale: string,
  style: "tick" | "full",
): string {
  const start = boundaries[index];
  const last = boundaries[index + 1] - 1;
  switch (grouping) {
    case "day":
      return displayDay(start, locale, style === "tick" ? "day" : "dayYear");
    case "week":
      return style === "tick"
        ? displayDay(start, locale, "day")
        : `${displayDay(start, locale, "day")} – ${displayDay(last, locale, "dayYear")}`;
    case "month":
      if (style === "full") return displayDay(start, locale, "monthYear");
      return fromEpochDay(start).slice(5, 7) === "01"
        ? displayDay(start, locale, "year")
        : displayDay(start, locale, "month");
    case "year":
      return displayDay(start, locale, "year");
  }
}
