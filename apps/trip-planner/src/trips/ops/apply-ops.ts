import { tripSchema } from "../trip-schema.ts";
import type { Day, Moment, Trip } from "../types.ts";
import { addDays, daysBetween } from "./add-days.ts";
import { digest } from "./digest.ts";
import {
  itemSchema,
  opSchema,
  type DayList,
  type Item,
  type ItemPlace,
  type Op,
} from "./op-schema.ts";

export type ApplyResult =
  | { status: "applied"; trip: Trip }
  /**
   * The thing that the op at `index` changes is not as its sender saw it.
   * `current` is that thing now, or null when it is gone, and `expect` is
   * its digest: send the op again with it to keep the sender's change.
   */
  | {
      status: "conflict";
      index: number;
      current: unknown;
      expect: string | null;
    }
  /** The op at `index` cannot apply, or makes a trip that is not valid. */
  | { status: "refused"; index: number; reason: string };

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;
/** An op as the sender makes it, before `withExpect` adds what it saw. */
export type DraftOp = DistributiveOmit<Op, "expect">;

type AddOp = Extract<DraftOp, { op: "addDay" | "addMoment" | "addItem" }>;

/** An add never conflicts, so it carries no `expect`. */
function isAdd(op: DraftOp): op is AddOp {
  return op.op === "addDay" || op.op === "addMoment" || op.op === "addItem";
}

class Refusal extends Error {}

/**
 * Applies a batch of ops to a trip, in order, all or none. It changes
 * nothing it is given and does no I/O, so the server, the editor and the
 * model all use it.
 *
 * - Each op that is not an add must carry `expect`, the digest of the thing
 *   it changes as the trip stands at that op (`withExpect` makes them).
 * - Dates stay in place and the plans of days move between them. Adding or
 *   removing a day moves each later day by one date.
 * - A moment that the batch leaves with no text, no highlight and no items
 *   goes.
 * - A stay that would repeat a night that is gone or later gets its own copy
 *   of that night's lodging.
 */
export function applyOps(trip: Trip, ops: readonly Op[]): ApplyResult {
  let state = structuredClone(trip);
  const touched = new Set<string>();
  for (const [index, raw] of ops.entries()) {
    const parsed = opSchema.safeParse(raw);
    if (!parsed.success) {
      return { status: "refused", index, reason: issueText(parsed.error) };
    }
    const op = parsed.data;
    if (!isAdd(op)) {
      const thing = thingOf(state, op);
      const now = thing === undefined ? null : digest(thing);
      if (!("expect" in op) || now !== op.expect) {
        return {
          status: "conflict",
          index,
          current: thing ?? null,
          expect: now,
        };
      }
    }
    try {
      applyOne(state, op, touched);
    } catch (error) {
      if (error instanceof Refusal) {
        return { status: "refused", index, reason: error.message };
      }
      throw error;
    }
    const valid = tripSchema.safeParse(state);
    if (!valid.success) {
      return { status: "refused", index, reason: issueText(valid.error) };
    }
    state = valid.data;
  }
  for (const day of state.days) {
    day.moments = day.moments.filter(
      (moment) => !touched.has(moment.id) || !isEmptyMoment(moment),
    );
  }
  return { status: "applied", trip: state };
}

/**
 * The ops with `expect` filled from the trip as each op would find it, for
 * a sender who applies a batch to the trip it shows.
 */
export function withExpect(trip: Trip, ops: readonly DraftOp[]): Op[] {
  let state = structuredClone(trip);
  const touched = new Set<string>();
  return ops.map((draft) => {
    let op: Op;
    if (isAdd(draft)) {
      op = draft;
    } else {
      const thing = thingOf(state, draft);
      op = { ...draft, expect: thing === undefined ? "gone" : digest(thing) };
    }
    const parsed = opSchema.safeParse(op);
    if (!parsed.success) return op;
    try {
      applyOne(state, parsed.data, touched);
    } catch {
      // The rest is stamped against the trip as it is. `applyOps` refuses
      // this op in its turn.
      return op;
    }
    const valid = tripSchema.safeParse(state);
    if (valid.success) state = valid.data;
    return op;
  });
}

/** The digest that an op on this trip carries as `expect`, or null for an add or a thing that is gone. */
export function expectedOf(trip: Trip, op: DraftOp): string | null {
  if (isAdd(op)) return null;
  const thing = thingOf(trip, op);
  return thing === undefined ? null : digest(thing);
}

/**
 * What an op changes, as `expect` digests it: the fields that a set
 * changes; all of a thing that a move or a remove takes, with what it
 * holds; the order of the days for a move of a day.
 */
function thingOf(trip: Trip, op: DraftOp): unknown {
  switch (op.op) {
    case "setTrip":
      return {
        title: trip.title,
        subtitle: trip.subtitle,
        party: trip.party,
        timeZone: trip.timeZone,
        language: trip.language,
      };
    case "setFirstDate":
      return { firstDate: trip.days[0].date };
    case "removeDay":
      return trip.days.find((day) => day.id === op.id);
    case "moveDay":
      return { dayIds: trip.days.map((day) => day.id) };
    case "setDay": {
      const day = trip.days.find((each) => each.id === op.id);
      if (!day) return undefined;
      const {
        id: _id,
        date: _date,
        moments: _moments,
        tips: _tips,
        dining: _dining,
        places: _places,
        stay: _stay,
        ...own
      } = day;
      return own;
    }
    case "setMoment": {
      const moment = findMoment(trip, op.id)?.moment;
      if (!moment) return undefined;
      return {
        time: moment.time,
        text: moment.text,
        highlight: moment.highlight,
      };
    }
    case "moveMoment":
    case "removeMoment":
      return findMoment(trip, op.id)?.moment;
    case "setItem":
    case "moveItem":
    case "removeItem":
      return findItem(trip, op.id)?.item;
    case "setStay": {
      const day = trip.days.find((each) => each.id === op.dayId);
      if (!day) return undefined;
      const { lodging: _lodging, ...own } = day.stay;
      return own;
    }
    case "addDay":
    case "addMoment":
    case "addItem":
      return undefined;
  }
}

function applyOne(trip: Trip, op: DraftOp, touched: Set<string>) {
  switch (op.op) {
    case "setTrip":
      patch(trip, op.fields);
      return;
    case "setFirstDate": {
      const shift = daysBetween(trip.days[0].date, op.date);
      for (const day of trip.days) day.date = addDays(day.date, shift);
      return;
    }
    case "addDay": {
      let at = op.before ? dayIndex(trip, op.before) : -1;
      if (at < 0) at = trip.days.length;
      const date =
        at < trip.days.length
          ? trip.days[at].date
          : addDays(trip.days[trip.days.length - 1].date, 1);
      for (const day of trip.days.slice(at)) day.date = addDays(day.date, 1);
      trip.days.splice(at, 0, {
        id: op.id,
        date,
        moments: [],
        tips: [],
        dining: [],
        places: [],
        stay: { lodging: [] },
      });
      return;
    }
    case "removeDay": {
      if (trip.days.length === 1) {
        throw new Refusal("A trip keeps at least one day.");
      }
      const before = structuredClone(trip.days);
      const at = dayIndex(trip, op.id);
      for (const day of trip.days.slice(at + 1)) {
        day.date = addDays(day.date, -1);
      }
      trip.days.splice(at, 1);
      for (const person of trip.people) {
        person.days = Object.fromEntries(
          Object.entries(person.days).filter(([dayId]) => dayId !== op.id),
        );
      }
      keepStaysEarlier(trip, before);
      return;
    }
    case "moveDay": {
      if (op.before === op.id) return;
      const before = structuredClone(trip.days);
      const dates = trip.days.map((day) => day.date);
      const [plan] = trip.days.splice(dayIndex(trip, op.id), 1);
      let at = op.before ? dayIndex(trip, op.before) : -1;
      if (at < 0) at = trip.days.length;
      trip.days.splice(at, 0, plan);
      trip.days.forEach((day, i) => {
        day.date = dates[i];
      });
      keepStaysEarlier(trip, before);
      return;
    }
    case "setDay":
      patch(dayOf(trip, op.id), op.fields);
      return;
    case "addMoment": {
      const moment: Moment = {
        id: op.moment.id,
        time: op.moment.time,
        items: [],
      };
      patch(moment, { text: op.moment.text, highlight: op.moment.highlight });
      dayOf(trip, op.dayId).moments.push(moment);
      touched.add(moment.id);
      return;
    }
    case "setMoment": {
      const found = findMoment(trip, op.id);
      if (!found) throw new Refusal(`No moment ${op.id}.`);
      patch(found.moment, op.fields);
      touched.add(op.id);
      return;
    }
    case "moveMoment": {
      const target = dayOf(trip, op.dayId);
      const found = findMoment(trip, op.id);
      if (!found) throw new Refusal(`No moment ${op.id}.`);
      found.day.moments.splice(found.index, 1);
      target.moments.push(found.moment);
      return;
    }
    case "removeMoment": {
      const found = findMoment(trip, op.id);
      if (!found) throw new Refusal(`No moment ${op.id}.`);
      found.day.moments.splice(found.index, 1);
      return;
    }
    case "addItem":
      placeItem(
        trip,
        checkedItem(withQuery(cleared(op.item))),
        op.to,
        op.before,
      );
      return;
    case "setItem": {
      const found = findItem(trip, op.id);
      if (!found) throw new Refusal(`No item ${op.id}.`);
      if ("id" in op.fields || "type" in op.fields) {
        throw new Refusal("The id and the kind of an item never change.");
      }
      const next: Record<string, unknown> = { ...found.item };
      const queryFollows =
        "query" in next && next.query === next.name && !("query" in op.fields);
      patch(next, op.fields);
      if (queryFollows) next.query = next.name;
      const item = checkedItem(withQuery(next));
      takeItem(trip, found);
      placeItem(trip, item, found.place, found.nextId);
      return;
    }
    case "moveItem": {
      const found = findItem(trip, op.id);
      if (!found) throw new Refusal(`No item ${op.id}.`);
      takeItem(trip, found);
      if ("momentId" in found.place) touched.add(found.place.momentId);
      placeItem(trip, found.item, op.to, op.before);
      return;
    }
    case "removeItem": {
      const found = findItem(trip, op.id);
      if (!found) throw new Refusal(`No item ${op.id}.`);
      takeItem(trip, found);
      if ("momentId" in found.place) touched.add(found.place.momentId);
      return;
    }
    case "setStay":
      patch(dayOf(trip, op.dayId).stay, op.fields);
      return;
  }
}

/** Sets each named field. `null` and text that is only space clear it. */
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
function cleared(item: object): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  patch(out, item);
  return out;
}

/** A place to eat or go is found on a map by its name when it has no `query`. */
function withQuery(item: Record<string, unknown>) {
  if (
    (item.type === "dining" || item.type === "place") &&
    item.query === undefined
  ) {
    item.query = item.name;
  }
  return item;
}

function checkedItem(item: Record<string, unknown>): Item {
  const result = itemSchema.safeParse(item);
  if (!result.success) throw new Refusal(issueText(result.error));
  return result.data;
}

interface FoundItem {
  item: Item;
  place: ItemPlace;
  /** The id of the item after it in its place, to put a changed item back where it was. */
  nextId: string | undefined;
}

function findItem(trip: Trip, id: string): FoundItem | undefined {
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
function dayLists(day: Day): { list: DayList; items: Item[] }[] {
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

function takeItem(trip: Trip, { item, place }: FoundItem) {
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
function placeItem(
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

function insertBefore<T extends { id: string }>(
  entries: T[],
  entry: T,
  before: string | undefined,
) {
  const at = before ? entries.findIndex((each) => each.id === before) : -1;
  entries.splice(at < 0 ? entries.length : at, 0, entry);
}

function removeById(entries: { id: string }[], id: string) {
  const at = entries.findIndex((each) => each.id === id);
  if (at >= 0) entries.splice(at, 1);
}

function findMoment(trip: Trip, id: string) {
  for (const day of trip.days) {
    const index = day.moments.findIndex((moment) => moment.id === id);
    if (index >= 0) return { day, index, moment: day.moments[index] };
  }
  return undefined;
}

function dayIndex(trip: Trip, id: string) {
  return trip.days.findIndex((day) => day.id === id);
}

function dayOf(trip: Trip, id: string): Day {
  const day = trip.days.find((each) => each.id === id);
  if (!day) throw new Refusal(`No day ${id}.`);
  return day;
}

function isEmptyMoment(moment: Moment) {
  return (
    moment.text === undefined &&
    moment.highlight === undefined &&
    moment.items.length === 0
  );
}

/**
 * A stay repeats only an earlier night. One that would repeat a night that
 * is gone or now later repeats the night that one repeated, if that is
 * still earlier; else it gets its own copy of that lodging. The ids of the
 * copies come from the ids they copy, so every caller makes the same ones.
 */
function keepStaysEarlier(trip: Trip, before: Day[]) {
  trip.days.forEach((day, i) => {
    const sameAs = day.stay.sameAs;
    if (!sameAs) return;
    const isEarlier = (id: string) => {
      const at = dayIndex(trip, id);
      return at >= 0 && at < i;
    };
    if (isEarlier(sameAs.dayId)) return;
    const seen = new Set<string>();
    let source = before.find((each) => each.id === sameAs.dayId);
    while (source?.stay.sameAs && !seen.has(source.id)) {
      seen.add(source.id);
      const next = source.stay.sameAs.dayId;
      if (isEarlier(next)) {
        day.stay.sameAs = { ...sameAs, dayId: next };
        return;
      }
      source = before.find((each) => each.id === next);
    }
    const copies = (source?.stay.lodging ?? []).map((lodging) => ({
      ...structuredClone(lodging),
      id: `l${digest(`${lodging.id}@${day.id}`)}`,
    }));
    day.stay.lodging = [...copies, ...day.stay.lodging];
    delete day.stay.sameAs;
  });
}

function issueText(error: {
  issues: { path: PropertyKey[]; message: string }[];
}): string {
  const [issue] = error.issues;
  const path = issue.path.map(String).join(".");
  return path ? `${path}: ${issue.message}` : issue.message;
}
