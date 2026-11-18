import { tripSchema } from "../trip-schema.ts";
import type { Day, Moment, Trip } from "../types.ts";
import { addDays, daysBetween } from "./add-days.ts";
import { digest } from "./digest.ts";
import {
  checkedItem,
  cleared,
  dayOf,
  findItem,
  findMoment,
  insertBefore,
  patch,
  placeItem,
  takeItem,
  withQuery,
} from "./find-item.ts";
import { opSchema, type DraftOp, type Op } from "./op-schema.ts";
import { issueText, Refusal } from "./refusal.ts";

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

export type { DraftOp };

type AddOp = Extract<DraftOp, { op: "addDay" | "addMoment" | "addItem" }>;

/** An add never conflicts, so it carries no `expect`. */
function isAdd(op: DraftOp): op is AddOp {
  return op.op === "addDay" || op.op === "addMoment" || op.op === "addItem";
}

/**
 * Applies a batch of ops to a trip, in order, all or none. It changes
 * nothing it is given and does no I/O, so the server, the editor and the
 * model all use it.
 *
 * - Each op that is not an add must carry `expect`, the digest of the thing
 *   it changes as the trip stands at that op (`withExpect` makes them).
 * - Dates stay in place and the plans of days move between them. Adding or
 *   removing a day moves each later day by one date.
 * - A moment that the batch empties, by taking its last item or clearing
 *   its text and highlight, goes. A moment that the batch adds stays, also
 *   with nothing in it, unless the batch then empties it.
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
      const guard = guardOf(state, op);
      const now = guard === undefined ? null : digest(guard);
      if (
        !("expect" in op) ||
        (op.expect !== now && op.expect !== expectBeforeGuards(state, op))
      ) {
        return {
          status: "conflict",
          index,
          current: thingOf(state, op) ?? null,
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
  let state = trip;
  const touched = new Set<string>();
  return ops.map((draft) => {
    let op: Op;
    if (isAdd(draft)) {
      op = draft;
    } else {
      const guard = guardOf(state, draft);
      op = { ...draft, expect: guard === undefined ? "gone" : digest(guard) };
    }
    // When the op cannot apply, the rest is stamped against the trip as it
    // is. `applyOps` refuses this op in its turn.
    state = step(state, op, touched) ?? state;
    return op;
  });
}

/**
 * The trip after the drafts, as `applyOps` makes it, but with no check of
 * `expect` and with each moment kept; undefined when a draft cannot apply.
 */
export function applyDrafts(
  trip: Trip,
  drafts: readonly DraftOp[],
): Trip | undefined {
  let state: Trip | undefined = trip;
  const touched = new Set<string>();
  for (const draft of drafts) {
    const op = isAdd(draft) ? draft : { ...draft, expect: "-" };
    state = step(state, op, touched);
    if (!state) return undefined;
  }
  return state;
}

/** The trip after one op, or undefined when the op cannot apply. */
function step(trip: Trip, op: Op, touched: Set<string>): Trip | undefined {
  const parsed = opSchema.safeParse(op);
  if (!parsed.success) return undefined;
  const state = structuredClone(trip);
  try {
    applyOne(state, parsed.data, touched);
  } catch (error) {
    if (error instanceof Refusal) return undefined;
    throw error;
  }
  const valid = tripSchema.safeParse(state);
  return valid.success ? valid.data : undefined;
}

/** The digest that an op on this trip carries as `expect`, or null for an add or a thing that is gone. */
export function expectedOf(trip: Trip, op: DraftOp): string | null {
  if (isAdd(op)) return null;
  const guard = guardOf(trip, op);
  return guard === undefined ? null : digest(guard);
}

/**
 * What `expect` digests for an op: the thing that the op changes and, for
 * a move or a remove, each other thing that the op takes away or relies
 * on. That is where the thing is, a day, a moment or a list, because a
 * remove takes the thing from the place where someone else put it and a
 * move writes over that place. It is not the position among the things
 * beside it, which changes each time that a neighbour moves. For a day it
 * is also who is there that day, which goes with the day. For the stay of
 * a day it is also which stays that day and the day it repeats have,
 * because a repeat hides the stays of its own day and ends the nights of
 * the day it repeats.
 */
function guardOf(trip: Trip, op: DraftOp): unknown {
  switch (op.op) {
    case "removeDay": {
      const day = trip.days.find((each) => each.id === op.id);
      if (!day) return undefined;
      return {
        day,
        presence: trip.people.map((person) => [
          person.id,
          person.days[op.id] ?? null,
        ]),
      };
    }
    case "moveMoment":
    case "removeMoment": {
      const found = findMoment(trip, op.id);
      return found && { moment: found.moment, dayId: found.day.id };
    }
    case "moveItem":
    case "removeItem": {
      const found = findItem(trip, op.id);
      return found && { item: found.item, place: found.place };
    }
    case "setStay": {
      const day = trip.days.find((each) => each.id === op.dayId);
      if (!day) return undefined;
      const lodgingIds = (each: Day | undefined) =>
        each?.stay.lodging.map((lodging) => lodging.id) ?? null;
      const repeated = trip.days.find(
        (each) => each.id === day.stay.sameAs?.dayId,
      );
      return {
        stay: thingOf(trip, op),
        lodging: lodgingIds(day),
        repeated: lodgingIds(repeated),
      };
    }
    default:
      return thingOf(trip, op);
  }
}

/**
 * The `expect` of an editor that was open before `guardOf` covered more
 * than the thing: the digest of the thing only. `applyOps` takes it too, so
 * that such an editor saves as it did before, with no more protection than
 * it had. Remove this function when no such editor is open any more.
 */
function expectBeforeGuards(trip: Trip, op: DraftOp): string | null {
  // An old `setStay` does not see a stay that is new on its day or on the
  // day it repeats, and can hide that stay. Thus it gets a conflict.
  if (op.op === "setStay") return null;
  const thing = thingOf(trip, op);
  return thing === undefined ? null : digest(thing);
}

/**
 * The thing that an op changes: the fields that a set changes; all of a
 * thing that a move or a remove takes, with what it holds; the order of
 * the days for a move of a day.
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
    case "setPresence": {
      const person = trip.people.find((each) => each.id === op.personId);
      if (!person || !trip.days.some((day) => day.id === op.dayId)) {
        return undefined;
      }
      return { presence: person.days[op.dayId] ?? null };
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
      const at = dayIndexBefore(trip, op.before);
      const date =
        op.date ??
        (at < trip.days.length
          ? trip.days[at].date
          : addDays(trip.days[trip.days.length - 1].date, 1));
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
      const at = dayIndexBefore(trip, op.before);
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
      insertBefore(dayOf(trip, op.dayId).moments, moment, op.before);
      touched.delete(moment.id);
      return;
    }
    case "setMoment": {
      const found = findMoment(trip, op.id);
      if (!found) throw new Refusal(`No moment ${op.id}.`);
      const { text, highlight } = found.moment;
      patch(found.moment, op.fields);
      if (
        (text && !found.moment.text) ||
        (highlight && !found.moment.highlight)
      ) {
        touched.add(op.id);
      }
      return;
    }
    case "moveMoment": {
      const target = dayOf(trip, op.dayId);
      const found = findMoment(trip, op.id);
      if (!found) throw new Refusal(`No moment ${op.id}.`);
      found.day.moments.splice(found.index, 1);
      insertBefore(target.moments, found.moment, op.before);
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
    case "setPresence": {
      const person = trip.people.find((each) => each.id === op.personId);
      if (!person) throw new Refusal(`No person ${op.personId}.`);
      dayOf(trip, op.dayId);
      if (op.presence) {
        person.days[op.dayId] = op.presence;
      } else {
        Reflect.deleteProperty(person.days, op.dayId);
      }
      return;
    }
  }
}

/** Where a day goes in front of the day `before`, or last. */
function dayIndexBefore(trip: Trip, before: string | undefined) {
  const at = before ? dayIndex(trip, before) : -1;
  // As in `insertBefore`: a day whose `before` is gone goes last.
  return at < 0 ? trip.days.length : at;
}

function dayIndex(trip: Trip, id: string) {
  return trip.days.findIndex((day) => day.id === id);
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
 * copies come from the ids they copy, so every caller makes the same ones,
 * and a stay that holds a copy already gets no second one.
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
    const held = new Set(day.stay.lodging.map((lodging) => lodging.id));
    const copies = (source?.stay.lodging ?? [])
      .map((lodging) => ({
        ...structuredClone(lodging),
        id: `l${digest(`${lodging.id}@${day.id}`)}`,
      }))
      .filter((copy) => !held.has(copy.id));
    day.stay.lodging = [...copies, ...day.stay.lodging];
    delete day.stay.sameAs;
  });
}
