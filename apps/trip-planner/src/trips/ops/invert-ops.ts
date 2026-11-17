import type { Day, Moment, Trip } from "../types.ts";
import {
  applyDrafts,
  applyOps,
  withExpect,
  type DraftOp,
} from "./apply-ops.ts";
import { digest } from "./digest.ts";
import { dayLists } from "./find-item.ts";
import type { Item, ItemPlace } from "./op-schema.ts";

/**
 * The batch that undoes a batch: applied to the trip that `ops` made from
 * `before`, it gives `before` again, with the same ids. It is empty when
 * `ops` do not apply to `before`.
 *
 * The undo first puts the days back as they were, op by op from the last,
 * so each day gets its plan and its date again. Then it changes what the
 * days hold to what `before` holds, so that it also brings back what the
 * batch took out on its own: a moment that it left empty, a lodging that it
 * copied for a stay.
 */
export function invertOps(before: Trip, ops: readonly DraftOp[]): DraftOp[] {
  const forward = applyOps(before, withExpect(before, ops));
  if (forward.status !== "applied") return [];
  const after = forward.trip;
  const undo: DraftOp[] = [];
  const tripFields = changed(after, before, [
    "title",
    "subtitle",
    "party",
    "timeZone",
    "language",
  ]);
  if (tripFields) undo.push({ op: "setTrip", fields: tripFields });
  undo.push(...undoDays(before, ops));
  const days = applyDrafts(after, undo);
  if (!days) return undo;
  return [...undo, ...restoreContent(days, before)];
}

/** The ops that put the days back in order and on their dates, last op first. */
function undoDays(before: Trip, ops: readonly DraftOp[]): DraftOp[] {
  const undo: DraftOp[] = [];
  let state = before;
  for (const op of ops) {
    const at = state.days.findIndex((day) => "id" in op && day.id === op.id);
    const next = state.days.at(at + 1)?.id;
    switch (op.op) {
      case "addDay":
        undo.unshift({ op: "removeDay", id: op.id });
        break;
      case "removeDay":
        undo.unshift({
          op: "addDay",
          id: op.id,
          date: state.days[at].date,
          ...(next && { before: next }),
        });
        break;
      case "moveDay":
        undo.unshift({
          op: "moveDay",
          id: op.id,
          ...(next && { before: next }),
        });
        break;
      case "setFirstDate":
        undo.unshift({ op: "setFirstDate", date: state.days[0].date });
        break;
      default:
        break;
    }
    state = applyDrafts(state, [op]) ?? state;
  }
  return undo;
}

/**
 * The ops that change what each day holds from `from` to `to`, when the two
 * have the same days in the same order.
 */
function restoreContent(from: Trip, to: Trip): DraftOp[] {
  const ops: DraftOp[] = [];
  for (const day of to.days) {
    const now = from.days.find((each) => each.id === day.id);
    if (!now) continue;
    const dayFields = changed(now, day, [
      "title",
      "route",
      "driving",
      "drivingMinutes",
      "weather",
      "coords",
    ]);
    if (dayFields) ops.push({ op: "setDay", id: day.id, fields: dayFields });
    const stayFields = changed(now.stay, day.stay, [
      "summary",
      "note",
      "bookingUrl",
      "sameAs",
    ]);
    if (stayFields) {
      ops.push({ op: "setStay", dayId: day.id, fields: stayFields });
    }
  }
  for (const person of to.people) {
    const now = from.people.find((each) => each.id === person.id);
    if (!now) continue;
    for (const dayId of new Set([
      ...Object.keys(now.days),
      ...Object.keys(person.days),
    ])) {
      if (now.days[dayId] !== person.days[dayId]) {
        ops.push({
          op: "setPresence",
          personId: person.id,
          dayId,
          presence: person.days[dayId] ?? null,
        });
      }
    }
  }
  return [...ops, ...restoreMoments(from, to)];
}

/**
 * Puts each moment and each item where `to` has it, with what `to` gives
 * it. A moment that is empty in `to` comes back last, as a new add, because
 * a batch takes out a moment that it leaves empty.
 */
function restoreMoments(from: Trip, to: Trip): DraftOp[] {
  const fromMoments = momentsOf(from);
  const toMoments = momentsOf(to);
  const comesBack = new Set(
    [...toMoments.values()]
      .filter(
        ({ moment }) =>
          isEmpty(moment) && !same(fromMoments.get(moment.id)?.moment, moment),
      )
      .map(({ moment }) => moment.id),
  );

  const ops: DraftOp[] = [];
  for (const day of to.days) {
    const wanted = day.moments.filter((moment) => !comesBack.has(moment.id));
    const now = from.days.find((each) => each.id === day.id)?.moments ?? [];
    ops.push(
      ...arrange(wanted, now, (moment, before) => {
        if (!fromMoments.has(moment.id)) {
          return {
            op: "addMoment",
            dayId: day.id,
            moment: newMoment(moment),
            ...before,
          };
        }
        return { op: "moveMoment", id: moment.id, dayId: day.id, ...before };
      }),
    );
    for (const moment of wanted) {
      const was = fromMoments.get(moment.id)?.moment;
      if (!was) continue;
      const fields = changed(was, moment, ["text", "highlight"]);
      if (was.time !== moment.time || fields) {
        ops.push({
          op: "setMoment",
          id: moment.id,
          fields: { ...fields, time: moment.time },
        });
      }
    }
  }

  ops.push(...restoreItems(from, to));

  for (const id of fromMoments.keys()) {
    if (!toMoments.has(id) || comesBack.has(id)) {
      ops.push({ op: "removeMoment", id });
    }
  }
  for (const day of to.days) {
    const moments = day.moments;
    for (let i = moments.length - 1; i >= 0; i--) {
      if (!comesBack.has(moments[i].id)) continue;
      const next = moments.at(i + 1)?.id;
      ops.push({
        op: "addMoment",
        dayId: day.id,
        moment: newMoment(moments[i]),
        ...(next && { before: next }),
      });
    }
  }
  return ops;
}

/** The ops that change each item to what `to` has, put it where `to` has it, and take out the rest. */
function restoreItems(from: Trip, to: Trip): DraftOp[] {
  const fromItems = itemsOf(from);
  const toItems = itemsOf(to);
  const ops: DraftOp[] = [];
  for (const [id, { item }] of toItems) {
    const was = fromItems.get(id)?.item;
    if (!was || same(was, item)) continue;
    const fields: Record<string, unknown> = {};
    for (const key of new Set([...Object.keys(was), ...Object.keys(item)])) {
      if (key === "id" || key === "type") continue;
      const value: unknown = Reflect.get(item, key);
      if (!same(Reflect.get(was, key), value)) fields[key] = value ?? null;
    }
    // A `query` that is the same as `name` follows a new name unless the
    // op names it.
    if ("name" in fields) fields.query = Reflect.get(item, "query") ?? null;
    ops.push({ op: "setItem", id, fields });
  }

  const fromContainers = containersOf(from);
  for (const [key, { place, items }] of containersOf(to)) {
    ops.push(
      ...arrange(items, fromContainers.get(key)?.items ?? [], (item, before) =>
        fromItems.has(item.id)
          ? { op: "moveItem", id: item.id, to: place, ...before }
          : { op: "addItem", to: place, item, ...before },
      ),
    );
  }

  for (const id of fromItems.keys()) {
    if (!toItems.has(id)) ops.push({ op: "removeItem", id });
  }
  return ops;
}

/**
 * The ops that put `wanted` in this order in a place that now holds `now`.
 * The longest run of `wanted` that is already in order stays; each other
 * entry goes in just before the entry that follows it in `wanted`, from the
 * last entry back, so that its anchor is in place first.
 */
function arrange<T extends { id: string }>(
  wanted: readonly T[],
  now: readonly { id: string }[],
  place: (entry: T, before: { before?: string }) => DraftOp,
): DraftOp[] {
  const rank = new Map(wanted.map((entry, i) => [entry.id, i]));
  const order = now.flatMap((entry) => rank.get(entry.id) ?? []);
  const stays = longestRising(order);
  const ops: DraftOp[] = [];
  for (let i = wanted.length - 1; i >= 0; i--) {
    if (stays.has(i)) continue;
    const next = wanted.at(i + 1)?.id;
    ops.push(place(wanted[i], next ? { before: next } : {}));
  }
  return ops;
}

/** The values of the longest rising run that `values` holds in order. */
function longestRising(values: readonly number[]): Set<number> {
  const length = values.map(() => 1);
  const previous = values.map(() => -1);
  values.forEach((value, i) => {
    for (let j = 0; j < i; j++) {
      if (values[j] < value && length[j] + 1 > length[i]) {
        length[i] = length[j] + 1;
        previous[i] = j;
      }
    }
  });
  const run = new Set<number>();
  let at = length.indexOf(Math.max(0, ...length));
  while (at >= 0) {
    run.add(values[at]);
    at = previous[at];
  }
  return run;
}

function momentsOf(trip: Trip): Map<string, { day: Day; moment: Moment }> {
  return new Map(
    trip.days.flatMap((day) =>
      day.moments.map((moment) => [moment.id, { day, moment }] as const),
    ),
  );
}

/** Each place that holds items, with its items in order and with their kinds. */
function containersOf(
  trip: Trip,
): Map<string, { place: ItemPlace; items: Item[] }> {
  const containers = new Map<string, { place: ItemPlace; items: Item[] }>();
  for (const day of trip.days) {
    for (const moment of day.moments) {
      containers.set(`moment:${moment.id}`, {
        place: { momentId: moment.id },
        items: moment.items,
      });
    }
    for (const { list, items } of dayLists(day)) {
      containers.set(`list:${day.id}:${list}`, {
        place: { dayId: day.id, list },
        items,
      });
    }
  }
  return containers;
}

function itemsOf(trip: Trip): Map<string, { item: Item }> {
  return new Map(
    [...containersOf(trip).values()].flatMap(({ items }) =>
      items.map((item) => [item.id, { item }] as const),
    ),
  );
}

function newMoment({ id, time, text, highlight }: Moment) {
  return {
    id,
    time,
    ...(text && { text }),
    ...(highlight && { highlight }),
  };
}

function isEmpty(moment: Moment) {
  return !moment.text && !moment.highlight && moment.items.length === 0;
}

/** The fields among `keys` that differ, each with its value in `to`, or null to clear it. */
function changed<T extends object, K extends keyof T>(
  from: T,
  to: T,
  keys: readonly K[],
): { [P in K]?: NonNullable<T[P]> | null } | undefined {
  const fields: { [P in K]?: NonNullable<T[P]> | null } = {};
  for (const key of keys) {
    if (!same(from[key], to[key])) fields[key] = to[key] ?? null;
  }
  return Object.keys(fields).length > 0 ? fields : undefined;
}

function same(a: unknown, b: unknown) {
  return digest(a ?? null) === digest(b ?? null);
}
