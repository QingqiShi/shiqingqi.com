import type { Day } from "#src/trips/types.ts";
import { splitNote } from "../split-note.ts";
import { stayName } from "../stay-name.ts";

/** One bed, for one night or more in a row. */
export interface TripStay {
  /** The summary of the first night at the place, without a note in brackets. */
  name: string;
  /** The nights in a row in this bed. */
  nights: number;
  /**
   * The place among the places of the trip, from 0, which picks its colour.
   * A later stay at the same place has the same order.
   */
  order: number;
}

/** The id of the day whose bed a day repeats, through a chain of repeats. */
function placeOf(day: Day, byId: Map<string, Day>): string {
  const seen = new Set<string>();
  let current = day;
  while (current.stay.sameAs && !seen.has(current.id)) {
    seen.add(current.id);
    const next = byId.get(current.stay.sameAs.dayId);
    if (!next) return current.stay.sameAs.dayId;
    current = next;
  }
  return current.id;
}

/**
 * The bed of each night of the trip, by the date of the night. A night with
 * no lodging of its own, such as the last day, has none. Nights at the same
 * place join only when they are in a row.
 */
export function tripStays(days: Day[]): Map<string, TripStay> {
  const byId = new Map(days.map((day) => [day.id, day]));
  const orderOfPlace = new Map<string, number>();
  const byDate = new Map<string, TripStay>();
  let previousPlace: string | null = null;
  let previousStay: TripStay | null = null;
  for (const day of days) {
    if (!day.stay.sameAs && day.stay.lodging.length === 0) {
      previousPlace = null;
      continue;
    }
    const place = placeOf(day, byId);
    let stay: TripStay | null = previousPlace === place ? previousStay : null;
    if (!stay) {
      const order = orderOfPlace.get(place) ?? orderOfPlace.size;
      orderOfPlace.set(place, order);
      const first = byId.get(place) ?? day;
      stay = {
        name: splitNote(stayName(first.stay) ?? stayName(day.stay) ?? "").main,
        nights: 0,
        order,
      };
    }
    stay.nights += 1;
    byDate.set(day.date, stay);
    previousPlace = place;
    previousStay = stay;
  }
  return byDate;
}
