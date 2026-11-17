import { dayNumber } from "#src/trips/day-number.ts";
import type { Day, Trip } from "#src/trips/types.ts";

/** What changed on one day of a trip. A day that is new or gone has no counts. */
export interface DayChange {
  /** The number that the reader shows for the day: in the newer trip, or in the older one for a day that is gone. */
  number: number;
  status: "added" | "removed" | "changed";
  /** Moments and items that are new on the day. */
  added: number;
  /** Moments and items that are different or in another place, and the day's own details. */
  changed: number;
  /** Moments and items that left the day. */
  removed: number;
}

export interface ChangeSummary {
  /** The trip's own details changed: its title, the lines under it, its dates, its time zone or its people. */
  trip: boolean;
  /** The days with a change, in the order of the newer trip, then the days that are gone. */
  days: DayChange[];
}

interface Thing {
  dayId: string;
  /** The list that holds the thing: a day's moments, a moment's items, or a day's list with no time. */
  list: string;
  content: string;
}

/**
 * What changed from one version of a trip to the next: for each day, the
 * moments and items that are new, different or gone, matched by their ids.
 */
export function summarizeChange(older: Trip, newer: Trip): ChangeSummary {
  const before = thingsOf(older);
  const after = thingsOf(newer);
  const counts = new Map<
    string,
    { added: number; changed: number; removed: number }
  >();
  const count = (dayId: string, key: "added" | "changed" | "removed") => {
    const entry = counts.get(dayId) ?? { added: 0, changed: 0, removed: 0 };
    entry[key] += 1;
    counts.set(dayId, entry);
  };

  const olderLists = listsOf(before);
  const moved = new Set([
    ...movedIds(
      older.days.map((day) => day.id),
      newer.days.map((day) => day.id),
    ),
    ...[...listsOf(after)].flatMap(([list, ids]) =>
      movedIds(olderLists.get(list) ?? [], ids),
    ),
  ]);
  for (const [id, thing] of after) {
    const was = before.get(id);
    if (!was) count(thing.dayId, "added");
    else if (
      was.content !== thing.content ||
      was.list !== thing.list ||
      moved.has(id)
    ) {
      count(thing.dayId, "changed");
    }
  }
  for (const [id, thing] of before) {
    if (!after.has(id)) count(thing.dayId, "removed");
  }

  const olderDays = new Map(older.days.map((day) => [day.id, day]));
  const newerIds = new Set(newer.days.map((day) => day.id));
  const days: DayChange[] = [];
  newer.days.forEach((day, index) => {
    const number = dayNumber(newer, index);
    const was = olderDays.get(day.id);
    if (!was) {
      days.push({ number, status: "added", added: 0, changed: 0, removed: 0 });
      return;
    }
    const entry = counts.get(day.id) ?? { added: 0, changed: 0, removed: 0 };
    if (
      ownDetails(older, was) !== ownDetails(newer, day) ||
      moved.has(day.id)
    ) {
      entry.changed += 1;
    }
    if (entry.added + entry.changed + entry.removed > 0) {
      days.push({ number, status: "changed", ...entry });
    }
  });
  older.days.forEach((day, index) => {
    if (newerIds.has(day.id)) return;
    days.push({
      number: dayNumber(older, index),
      status: "removed",
      added: 0,
      changed: 0,
      removed: 0,
    });
  });

  return { trip: tripDetails(older) !== tripDetails(newer), days };
}

/** The moments and items of a trip by their ids. */
function thingsOf(trip: Trip): Map<string, Thing> {
  const things = new Map<string, Thing>();
  for (const day of trip.days) {
    for (const { items, ...moment } of day.moments) {
      things.set(moment.id, {
        dayId: day.id,
        list: day.id,
        content: stable(moment),
      });
      for (const item of items) {
        things.set(item.id, {
          dayId: day.id,
          list: moment.id,
          content: stable(item),
        });
      }
    }
    for (const [name, list] of [
      ["dining", day.dining],
      ["places", day.places],
      ["tips", day.tips],
      ["lodging", day.stay.lodging],
    ] as const) {
      for (const entry of list) {
        things.set(entry.id, {
          dayId: day.id,
          list: `${day.id}/${name}`,
          content: stable(entry),
        });
      }
    }
  }
  return things;
}

/** The ids of each list, in order. */
function listsOf(things: Map<string, Thing>): Map<string, string[]> {
  const lists = new Map<string, string[]>();
  for (const [id, thing] of things) {
    lists.set(thing.list, [...(lists.get(thing.list) ?? []), id]);
  }
  return lists;
}

/**
 * The ids that are in both lists but in another order: the fewest that a
 * person would have to move to make `older` into `newer`.
 */
function movedIds(
  older: readonly string[],
  newer: readonly string[],
): string[] {
  const at = new Map(older.map((id, index) => [id, index]));
  const kept = newer.filter((id) => at.has(id));
  const positions = kept.map((id) => at.get(id) ?? 0);
  // The longest run of ids that keep their order stays; the rest moved.
  const length = positions.map(() => 1);
  const previous = positions.map(() => -1);
  let best = -1;
  positions.forEach((position, i) => {
    for (let j = 0; j < i; j++) {
      if (positions[j] < position && length[j] + 1 > length[i]) {
        length[i] = length[j] + 1;
        previous[i] = j;
      }
    }
    if (best < 0 || length[i] > length[best]) best = i;
  });
  const stays = new Set<number>();
  for (let i = best; i >= 0; i = previous[i]) stays.add(i);
  return kept.filter((_, i) => !stays.has(i));
}

/** The details of a day other than its date, its moments and its lists: a day keeps its plan when its date moves. */
function ownDetails(trip: Trip, day: Day): string {
  const {
    id: _id,
    date: _date,
    moments: _moments,
    dining: _dining,
    places: _places,
    tips: _tips,
    stay: { lodging: _lodging, ...stay },
    ...details
  } = day;
  const presence = trip.people.map((person) => [
    person.id,
    person.days[day.id],
  ]);
  return stable({ details, stay, presence });
}

function tripDetails(trip: Trip): string {
  const { days, people, ...details } = trip;
  return stable({
    details,
    firstDate: days[0].date,
    people: people.map(({ days: _days, ...person }) => person),
  });
}

/** JSON with the keys of each object in order, so that two equal values give equal text. */
function stable(value: unknown): string {
  return JSON.stringify(value, (_key, field: unknown) =>
    field !== null && typeof field === "object" && !Array.isArray(field)
      ? Object.fromEntries(
          Object.entries(field).sort(([a], [b]) => a.localeCompare(b)),
        )
      : field,
  );
}
