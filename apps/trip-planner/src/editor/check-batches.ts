import { applyOps, type DraftOp } from "#src/trips/ops/apply-ops.ts";
import { findItem, findMoment } from "#src/trips/ops/find-item.ts";
import type { Op } from "#src/trips/ops/op-schema.ts";
import type { Trip } from "#src/trips/types.ts";
import { locateItem } from "./build-outline.ts";
import { dayRowId, isOnlyItsItem } from "./day-plan.ts";
import { touchedIds } from "./goes-with-theirs.ts";

/** What the person chose for a batch of a proposal. */
export type Decision = "accepted" | "skipped";

export type BatchCheck =
  /** The batch applies to the trip as it is. `after` is the trip with it. */
  | { state: "ready"; before: Trip; after: Trip }
  /**
   * The batch applies only after the batches of `needs`, which wait for a
   * decision. `before` is the trip with those, and `after` is with the
   * batch too.
   */
  | { state: "waits"; needs: number[]; before: Trip; after: Trip }
  /**
   * The batch does not apply. `needs` is the batch that the person skipped
   * and that would make it apply, when there is one.
   */
  | { state: "stale"; needs: number[] };

/** The trip with the ops, which carry the `expect` of the trip that the model read. */
function applied(trip: Trip, ops: readonly Op[]): Trip | null {
  const result = applyOps(trip, ops);
  return result.status === "applied" ? result.trip : null;
}

/** The ids of the days, moments and items that the ops add. */
function addedIds(ops: readonly DraftOp[]): Set<string> {
  return new Set(
    ops.flatMap((op) => {
      if (op.op === "addDay") return [op.id];
      if (op.op === "addMoment") return [op.moment.id];
      return op.op === "addItem" ? [op.item.id] : [];
    }),
  );
}

/** The ids of the things that the ops change, and of the places where they put things. */
function namedIds(ops: readonly DraftOp[]): string[] {
  return ops.flatMap((op) =>
    [
      "id" in op ? op.id : undefined,
      "dayId" in op ? op.dayId : undefined,
      "before" in op ? op.before : undefined,
      "to" in op && "momentId" in op.to ? op.to.momentId : undefined,
      "to" in op && "dayId" in op.to ? op.to.dayId : undefined,
      op.op === "setStay" ? op.fields.sameAs?.dayId : undefined,
    ].filter((id) => id !== undefined),
  );
}

function hasThing(trip: Trip, id: string): boolean {
  return (
    trip.days.some((day) => day.id === id) ||
    findMoment(trip, id) !== undefined ||
    findItem(trip, id) !== undefined
  );
}

/**
 * Which batches of a proposal the trip can take now: one check for each
 * batch, and null for a batch that has a decision. The server proved the
 * batches in order, each on the trip with all the batches before it, and
 * each op carries the `expect` of that proof. So a batch does not apply to
 * a thing that changed after the model read it, and a batch can need one
 * that the person has not accepted, or one that the person skipped.
 */
export function checkBatches(
  trip: Trip,
  batches: readonly { ops: readonly Op[] }[],
  decisions: ReadonlyMap<number, Decision>,
): (BatchCheck | null)[] {
  const made = batches.map((batch) => addedIds(batch.ops));
  const checks: (BatchCheck | null)[] = [];
  // The trip with each batch that waits for a decision, in order.
  let chain = trip;
  const inChain: number[] = [];

  const check = (index: number, ops: readonly Op[]): BatchCheck => {
    // The earlier batches that make a thing that this batch names and that
    // the trip does not have. `applyOps` cannot tell for each of them: it
    // puts a thing last when its `before` is not there.
    const absent = namedIds(ops).filter((id) => !hasThing(trip, id));
    const builds = made
      .slice(0, index)
      .flatMap((ids, earlier) =>
        absent.some((id) => ids.has(id)) ? [earlier] : [],
      );
    // A skipped batch, or an accepted one whose thing is gone again.
    if (builds.some((earlier) => decisions.has(earlier))) {
      return {
        state: "stale",
        needs: builds.filter((earlier) => decisions.get(earlier) === "skipped"),
      };
    }
    const needs = [...inChain];
    const before = chain;
    const inOrder = builds.every((earlier) => inChain.includes(earlier))
      ? applied(chain, ops)
      : null;
    if (inOrder) {
      chain = inOrder;
      inChain.push(index);
    }
    const alone = builds.length === 0 ? applied(trip, ops) : null;
    if (alone) return { state: "ready", before: trip, after: alone };
    // One earlier batch is often all that the batch needs.
    for (const [earlier, other] of checks.entries()) {
      if (other?.state !== "ready") continue;
      if (builds.some((each) => each !== earlier)) continue;
      const after = applied(other.after, ops);
      if (after) {
        return { state: "waits", needs: [earlier], before: other.after, after };
      }
    }
    if (inOrder) return { state: "waits", needs, before, after: inOrder };
    for (const [earlier, other] of batches.slice(0, index).entries()) {
      if (decisions.get(earlier) !== "skipped") continue;
      const base = applied(trip, other.ops);
      if (base && applied(base, ops))
        return { state: "stale", needs: [earlier] };
    }
    return { state: "stale", needs: [] };
  };

  for (const [index, batch] of batches.entries()) {
    checks.push(decisions.has(index) ? null : check(index, batch.ops));
  }
  return checks;
}

/**
 * Where the screen goes after a batch: the day and the thing that the
 * reader opens at, and the row of the edit screen that shows the change.
 * `after` is the trip with the batch.
 */
export function landingOf(
  after: Trip,
  batch: { dayIds: readonly string[]; ops: readonly DraftOp[] },
): { dayId?: string; thingId?: string; rowId?: string } {
  const ids = touchedIds(batch.ops);
  const item = ids
    .map((id) => locateItem(after, id))
    .find((found) => found !== undefined);
  if (item) {
    return { dayId: item.dayId, thingId: item.item.id, rowId: item.item.id };
  }
  const moment = ids
    .map((id) => findMoment(after, id))
    .find((found) => found !== undefined);
  if (moment) {
    return {
      dayId: moment.day.id,
      thingId: moment.moment.id,
      // A moment that shows as the row of its one item has no row of its own.
      rowId: isOnlyItsItem(moment.moment)
        ? moment.moment.items[0].id
        : moment.moment.id,
    };
  }
  const dayId = [...ids, ...batch.dayIds].find((id) =>
    after.days.some((day) => day.id === id),
  );
  if (dayId) return { dayId, rowId: dayRowId(dayId) };
  return ids.includes("trip") ? { rowId: "trip" } : {};
}
