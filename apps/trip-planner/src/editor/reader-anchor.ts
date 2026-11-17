import { momentDomId } from "#src/reader/day-feed/moment-dom-id.ts";
import { DAY_SECTION_IDS } from "#src/reader/day-section-ids.ts";
import { dayLists } from "#src/trips/ops/find-item.ts";
import type { Trip } from "#src/trips/types.ts";

/**
 * The id of the element of the reader that shows a moment or an item of
 * the trip: the moment, the moment that holds the item, or the section of
 * the list that holds the item. Null when the trip does not have the thing.
 */
export function readerAnchor(trip: Trip, id: string): string | null {
  for (const day of trip.days) {
    const moment = day.moments.find(
      (each) => each.id === id || each.items.some((item) => item.id === id),
    );
    if (moment) return momentDomId(moment.id);
    const list = dayLists(day).find(({ items }) =>
      items.some((item) => item.id === id),
    );
    if (list) return DAY_SECTION_IDS[list.list];
  }
  return null;
}
