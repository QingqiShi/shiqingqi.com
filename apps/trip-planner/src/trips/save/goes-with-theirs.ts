import { applyOps, type DraftOp } from "#src/trips/ops/apply-ops.ts";
import type { Op } from "#src/trips/ops/op-schema.ts";
import type { Trip } from "#src/trips/types.ts";

/** One change that a person made: a batch of ops that applies whole. */
export interface Batch {
  id: number;
  ops: readonly DraftOp[];
  /**
   * The ops as they go to the server. Each `expect` is from the trip that
   * the person saw when they made the change, so the server can tell when
   * someone else changed the same thing since.
   */
  sent: readonly Op[];
  /** The ids of the days, moments and items that the batch changes, and `trip` for the trip's own fields. */
  touches: readonly string[];
  /** The id of the batch that this one takes back, when it is an undo. */
  undoes?: number;
}

/** The ids of batches, with the id of each batch of `pending` that takes one of them back. */
export function withUndos(pending: readonly Batch[], ids: readonly number[]) {
  const all = new Set(ids);
  // An undo waits behind the batch that it takes back, so one pass finds it.
  for (const batch of pending) {
    if (batch.undoes !== undefined && all.has(batch.undoes)) all.add(batch.id);
  }
  return all;
}

/**
 * The batches that go when the person keeps the other version in a conflict
 * on the first batch of `pending`: that batch, each later batch that does
 * not apply to the other version as the person made it, and the undo of
 * each. The person made each of them on the version that they give up, and
 * the server would answer it as it answered the first. A batch goes whole,
 * because its ops can depend on each other.
 */
export function goesWithTheirs(
  theirs: Trip,
  pending: readonly Batch[],
): Batch[] {
  const gone = new Set(pending.slice(0, 1).map((batch) => batch.id));
  let trip = theirs;
  for (const batch of pending.slice(1)) {
    const result =
      batch.undoes !== undefined && gone.has(batch.undoes)
        ? null
        : applyOps(trip, batch.sent);
    if (result?.status === "applied") trip = result.trip;
    else gone.add(batch.id);
  }
  return pending.filter((batch) => gone.has(batch.id));
}

/** The ids of the things that a batch changes, for the state on their rows. */
export function touchedIds(ops: readonly DraftOp[]): string[] {
  const ids = new Set<string>();
  for (const op of ops) {
    switch (op.op) {
      case "setTrip":
      case "setFirstDate":
        ids.add("trip");
        break;
      case "setStay":
      case "setPresence":
        ids.add(op.dayId);
        break;
      case "addMoment":
        ids.add(op.moment.id);
        break;
      case "addItem":
        ids.add(op.item.id);
        break;
      case "addDay":
      case "removeDay":
      case "moveDay":
      case "setDay":
      case "setMoment":
      case "moveMoment":
      case "removeMoment":
      case "setItem":
      case "moveItem":
      case "removeItem":
        ids.add(op.id);
        break;
    }
  }
  return [...ids];
}
