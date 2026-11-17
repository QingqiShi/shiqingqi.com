import type { Day, Trip } from "../types.ts";
import {
  itemSchema,
  type DayList,
  type Item,
  type ItemPlace,
} from "./op-schema.ts";
import { issueText, Refusal } from "./refusal.ts";

export /** Sets each named field. `null` and text that is only space clear it. */
function patch(record: Record<string, unknown>, fields: object) {
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    if (value === null || (typeof value === "string" && value.trim() === "")) {
      Reflect.deleteProperty(record, key);
    } else {
      record[key] = value;
    }
  }
}

/** The item with each empty field taken out. */
export function cleared(item: object): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  patch(out, item);
  return out;
}

/** A place to eat or go is found on a map by its name when it has no `query`. */
export function withQuery(item: Record<string, unknown>) {
  if (
    (item.type === "dining" || item.type === "place") &&
    item.query === undefined
  ) {
    item.query = item.name;
  }
  return item;
}

export function checkedItem(item: Record<string, unknown>): Item {
  const result = itemSchema.safeParse(item);
  if (!result.success) throw new Refusal(issueText(result.error));
  return result.data;
}

export interface FoundItem {
  item: Item;
  place: ItemPlace;
  /** The id of the item after it in its place, to put a changed item back where it was. */
  nextId: string | undefined;
}

export function findItem(trip: Trip, id: string): FoundItem | undefined {
  for (const day of trip.days) {
    for (const moment of day.moments) {
      const index = moment.items.findIndex((item) => item.id === id);
      if (index >= 0) {
        return {
          item: moment.items[index],
          place: { momentId: moment.id },
          nextId: moment.items.at(index + 1)?.id,
        };
      }
    }
    for (const { list, items } of dayLists(day)) {
      const index = items.findIndex((item) => item.id === id);
      if (index >= 0) {
        return {
          item: items[index],
          place: { dayId: day.id, list },
          nextId: items.at(index + 1)?.id,
        };
      }
    }
  }
  return undefined;
}

/** The items of a day's lists with no time, each with its kind. */
export function dayLists(day: Day): { list: DayList; items: Item[] }[] {
  return [
    {
      list: "dining",
      items: day.dining.map((entry) => ({ ...entry, type: "dining" as const })),
    },
    {
      list: "places",
      items: day.places.map((entry) => ({ ...entry, type: "place" as const })),
    },
    {
      list: "tips",
      items: day.tips.map((entry) => ({ ...entry, type: "tip" as const })),
    },
    {
      list: "lodging",
      items: day.stay.lodging.map((entry) => ({
        ...entry,
        type: "lodging" as const,
      })),
    },
  ];
}

export function takeItem(trip: Trip, { item, place }: FoundItem) {
  if ("momentId" in place) {
    const found = findMoment(trip, place.momentId);
    if (found) removeById(found.moment.items, item.id);
    return;
  }
  const day = dayOf(trip, place.dayId);
  switch (place.list) {
    case "dining":
      removeById(day.dining, item.id);
      return;
    case "places":
      removeById(day.places, item.id);
      return;
    case "tips":
      removeById(day.tips, item.id);
      return;
    case "lodging":
      removeById(day.stay.lodging, item.id);
      return;
  }
}

/**
 * Puts an item in a place that holds its kind, before the item `before`, or
 * at the end when there is no such item there. A day's list knows the kind,
 * so its entries have no `type`.
 */
export function placeItem(
  trip: Trip,
  item: Item,
  place: ItemPlace,
  before: string | undefined,
) {
  if ("momentId" in place) {
    const found = findMoment(trip, place.momentId);
    if (!found) throw new Refusal(`No moment ${place.momentId}.`);
    if (item.type === "lodging") {
      throw new Refusal("A lodging belongs in the stay of a day.");
    }
    insertBefore(found.moment.items, item, before);
    return;
  }
  const day = dayOf(trip, place.dayId);
  const misfit = new Refusal(
    `The list ${place.list} cannot hold a ${item.type}.`,
  );
  switch (item.type) {
    case "dining": {
      if (place.list !== "dining") throw misfit;
      const { type: _type, ...entry } = item;
      insertBefore(day.dining, entry, before);
      return;
    }
    case "place": {
      if (place.list !== "places") throw misfit;
      const { type: _type, ...entry } = item;
      insertBefore(day.places, entry, before);
      return;
    }
    case "tip": {
      if (place.list !== "tips") throw misfit;
      const { type: _type, ...entry } = item;
      insertBefore(day.tips, entry, before);
      return;
    }
    case "lodging": {
      if (place.list !== "lodging") throw misfit;
      const { type: _type, ...entry } = item;
      insertBefore(day.stay.lodging, entry, before);
      return;
    }
    default:
      throw misfit;
  }
}

export function insertBefore<T extends { id: string }>(
  entries: T[],
  entry: T,
  before: string | undefined,
) {
  const at = before ? entries.findIndex((each) => each.id === before) : -1;
  // When another person removed `before`, the entry goes last. Thus the
  // change of this person stays.
  entries.splice(at < 0 ? entries.length : at, 0, entry);
}

export function removeById(entries: { id: string }[], id: string) {
  const at = entries.findIndex((each) => each.id === id);
  if (at >= 0) entries.splice(at, 1);
}

export function findMoment(trip: Trip, id: string) {
  for (const day of trip.days) {
    const index = day.moments.findIndex((moment) => moment.id === id);
    if (index >= 0) return { day, index, moment: day.moments[index] };
  }
  return undefined;
}

export function dayOf(trip: Trip, id: string): Day {
  const day = trip.days.find((each) => each.id === id);
  if (!day) throw new Refusal(`No day ${id}.`);
  return day;
}
