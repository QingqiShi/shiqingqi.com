import { momentMinutes } from "#src/reader/day-feed/moment-minutes.ts";
import { dayLists, findItem, findMoment } from "#src/trips/ops/find-item.ts";
import type { DayList, Item, ItemKind } from "#src/trips/ops/op-schema.ts";
import type { Day, Moment, MomentTime, Trip } from "#src/trips/types.ts";

/** The order of the kinds inside a moment, as the reader shows them. */
const KIND_ORDER: readonly ItemKind[] = [
  "flight",
  "checklist",
  "signSheet",
  "nav",
  "dining",
  "place",
  "tip",
  "lodging",
];

/** The list of a day that holds a kind of item with no time. A kind with no list lives only in a moment. */
export const LIST_OF_KIND: Partial<Record<ItemKind, DayList>> = {
  dining: "dining",
  place: "places",
  tip: "tips",
  lodging: "lodging",
};

export interface OutlineMoment {
  moment: Moment;
  items: Item[];
}

/** One day as the editor shows it: its moments by time, and the items with no time in the lists of the day, as the reader has them. */
export interface OutlineDay {
  day: Day;
  index: number;
  moments: OutlineMoment[];
  tips: Item[];
  dining: Item[];
  places: Item[];
  lodging: Item[];
}

export function buildOutline(trip: Trip): OutlineDay[] {
  return trip.days.map((day, index) => {
    const lists = dayLists(day);
    const itemsOf = (list: DayList) =>
      lists.find((each) => each.list === list)?.items ?? [];
    return {
      day,
      index,
      moments: day.moments
        .map((moment) => ({
          moment,
          items: [...moment.items].sort(
            (a, b) => KIND_ORDER.indexOf(a.type) - KIND_ORDER.indexOf(b.type),
          ),
        }))
        .sort(
          (a, b) => momentMinutes(a.moment.time) - momentMinutes(b.moment.time),
        ),
      tips: itemsOf("tips"),
      dining: itemsOf("dining"),
      places: itemsOf("places"),
      lodging: itemsOf("lodging"),
    };
  });
}

/** Where an item is: its day, and its moment when it has a time. */
export interface LocatedItem {
  item: Item;
  dayId: string;
  moment: Moment | null;
}

export function locateItem(trip: Trip, id: string): LocatedItem | undefined {
  const found = findItem(trip, id);
  if (!found) return undefined;
  const { item, place } = found;
  if ("dayId" in place) return { item, dayId: place.dayId, moment: null };
  const at = findMoment(trip, place.momentId);
  return at && { item, dayId: at.day.id, moment: at.moment };
}

/** A day and a time, as the sheet of an item holds them. No time puts the item in the day's list for its kind. */
export interface Slot {
  dayId: string;
  time: MomentTime | null;
}

export function slotOf(found: LocatedItem): Slot {
  return { dayId: found.dayId, time: found.moment?.time ?? null };
}
