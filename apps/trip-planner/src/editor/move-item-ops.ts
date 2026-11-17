import type { DraftOp } from "#src/trips/ops/apply-ops.ts";
import type { ItemPlace, NewItem } from "#src/trips/ops/op-schema.ts";
import type { Moment, MomentTime, Trip } from "#src/trips/types.ts";
import { LIST_OF_KIND, locateItem, type Slot } from "./build-outline.ts";

function momentAt(
  trip: Trip,
  dayId: string,
  time: MomentTime,
  except?: string,
): Moment | undefined {
  return trip.days
    .find((day) => day.id === dayId)
    ?.moments.find((moment) => moment.time === time && moment.id !== except);
}

/**
 * The place for an item at a slot, with the op that makes a moment when the
 * day has none at that time. Null when the kind has no list for a slot with
 * no time.
 */
function placeAt(
  trip: Trip,
  kind: NewItem["type"],
  slot: Slot,
  newMomentId: () => string,
  except?: string,
): { ops: DraftOp[]; place: ItemPlace } | null {
  const list = LIST_OF_KIND[kind];
  if (kind === "lodging" || slot.time === null) {
    return list ? { ops: [], place: { dayId: slot.dayId, list } } : null;
  }
  const existing = momentAt(trip, slot.dayId, slot.time, except);
  if (existing) return { ops: [], place: { momentId: existing.id } };
  const id = newMomentId();
  return {
    ops: [
      { op: "addMoment", dayId: slot.dayId, moment: { id, time: slot.time } },
    ],
    place: { momentId: id },
  };
}

/** The ops that add an item at a day and a time. */
export function addItemOps(
  trip: Trip,
  item: NewItem,
  slot: Slot,
  newMomentId: () => string,
): DraftOp[] {
  const target = placeAt(trip, item.type, slot, newMomentId);
  if (!target) return [];
  return [...target.ops, { op: "addItem", to: target.place, item }];
}

/**
 * The ops that bring an item to a day and a time.
 *
 * An item that is alone in its moment takes the moment with it, so that the
 * words of the moment stay with the item: "Dinner" at 19:00 with one
 * restaurant becomes "Dinner" at 20:00. When the day already has a moment
 * at the new time, the item joins that moment. With other items in its
 * moment, the item leaves alone. A moment that this leaves with no item and
 * no words goes by itself (`applyOps`). One with words stays, as a line of
 * the day.
 */
export function moveItemOps(
  trip: Trip,
  itemId: string,
  slot: Slot,
  newMomentId: () => string,
): DraftOp[] {
  const found = locateItem(trip, itemId);
  if (!found) return [];
  const { item, moment } = found;
  const time = item.type === "lodging" ? null : slot.time;
  if (found.dayId === slot.dayId && (moment?.time ?? null) === time) return [];

  if (
    moment &&
    time !== null &&
    moment.items.length === 1 &&
    !momentAt(trip, slot.dayId, time, moment.id)
  ) {
    return moveMomentOps(moment, found.dayId, { dayId: slot.dayId, time });
  }
  const target = placeAt(
    trip,
    item.type,
    { dayId: slot.dayId, time },
    newMomentId,
    moment?.id,
  );
  if (!target) return [];
  return [...target.ops, { op: "moveItem", id: itemId, to: target.place }];
}

/** The ops that bring a moment, with all it holds, to a day and a time. */
function moveMomentOps(
  moment: Moment,
  dayId: string,
  slot: { dayId: string; time: MomentTime },
): DraftOp[] {
  const ops: DraftOp[] = [];
  if (moment.time !== slot.time) {
    ops.push({ op: "setMoment", id: moment.id, fields: { time: slot.time } });
  }
  if (dayId !== slot.dayId) {
    ops.push({ op: "moveMoment", id: moment.id, dayId: slot.dayId });
  }
  return ops;
}
