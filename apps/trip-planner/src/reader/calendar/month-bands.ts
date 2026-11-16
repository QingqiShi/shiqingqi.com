import { dayBefore } from "./calendar-weeks.ts";
import type { TripStay } from "./trip-stays.ts";

/**
 * A stay under one week of the month grid. The week has fourteen tracks, two
 * for each day, between the grid lines 1 and 15.
 */
export interface WeekBand {
  stay: TripStay;
  start: number;
  end: number;
  /** It started in the week before. */
  continued: boolean;
  /** It goes on into the week after. */
  continues: boolean;
  /**
   * The text of the band: none where the band is shorter than a day, the
   * name with the count of nights on the first band of the stay that has
   * room, and the name alone on a later one.
   */
  label: "nights" | "name" | null;
}

/** The fewest tracks of a band that hold text: one day. */
const TEXT_TRACKS = 2;

/**
 * The stays under one week. A night runs from the middle of its day to the
 * middle of the next day, as a booking does, so the band of the night of
 * Sunday ends in the next week.
 */
function weekBands(week: string[], stays: Map<string, TripStay>) {
  const bands: Omit<WeekBand, "label">[] = [];
  for (let col = -1; col < 7; col++) {
    const stay = stays.get(col < 0 ? dayBefore(week[0]) : week[col]);
    if (!stay) continue;
    const start = Math.max(col * 2 + 2, 1);
    const end = Math.min(col * 2 + 4, 15);
    const last = bands.at(-1);
    if (last && last.stay === stay && last.end === start) {
      last.end = end;
      last.continues = col === 6;
    } else {
      bands.push({
        stay,
        start,
        end,
        continued: col < 0,
        continues: col === 6,
      });
    }
  }
  return bands;
}

/** The stays under each week of the month grid. */
export function monthBands(
  weeks: string[][],
  stays: Map<string, TripStay>,
): WeekBand[][] {
  const counted = new Set<TripStay>();
  return weeks.map((week) =>
    weekBands(week, stays).map((band): WeekBand => {
      if (band.end - band.start < TEXT_TRACKS) return { ...band, label: null };
      if (counted.has(band.stay)) return { ...band, label: "name" };
      counted.add(band.stay);
      return { ...band, label: "nights" };
    }),
  );
}
