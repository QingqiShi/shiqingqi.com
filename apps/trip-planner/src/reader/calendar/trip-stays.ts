import type { Day } from "#src/trips/types.ts";
import { splitNote } from "../split-note.ts";
import { stayName } from "../stay-name.ts";

/** One bed, for one night or more. */
export interface TripStay {
  /** The summary of the first night, without a note in brackets. */
  name: string;
  nights: number;
  /** Its place among the stays of the trip, from 0, which picks its colour. */
  order: number;
}

/**
 * The bed of each night of the trip, by the date of the night. A night with
 * no lodging of its own, such as the last day, has none.
 */
export function tripStays(days: Day[]): Map<string, TripStay> {
  const stayOfDay = new Map<string, TripStay | null>();
  let count = 0;
  const byDate = new Map<string, TripStay>();
  for (const day of days) {
    const earlier = day.stay.sameAs
      ? stayOfDay.get(day.stay.sameAs.dayId)
      : undefined;
    let stay = earlier ?? null;
    if (!stay && (day.stay.sameAs || day.stay.lodging.length > 0)) {
      stay = {
        name: splitNote(stayName(day.stay) ?? "").main,
        nights: 0,
        order: count++,
      };
    }
    stayOfDay.set(day.id, stay);
    if (stay) {
      stay.nights += 1;
      byDate.set(day.date, stay);
    }
  }
  return byDate;
}
