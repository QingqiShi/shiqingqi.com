import {
  applyOps,
  withExpect,
  type DraftOp,
} from "#src/trips/ops/apply-ops.ts";
import { findItem, findMoment } from "#src/trips/ops/find-item.ts";
import { draftOpSchema, type Op } from "#src/trips/ops/op-schema.ts";
import { issueText } from "#src/trips/ops/refusal.ts";
import type { Day, Trip } from "#src/trips/types.ts";
import type { RawBatch } from "./bind-placeholders.ts";

/** A change that applies whole, as the person accepts it. */
export interface ProvedBatch {
  /** The days that the batch adds, changes or removes, in the order of the trip. */
  dayIds: string[];
  summary: string;
  ops: DraftOp[];
  /**
   * `ops` with the `expect` of each, from the trip with the batches before
   * this one. With these, the batch applies only while each thing that it
   * changes is as the model read it.
   */
  sent: Op[];
}

export type Proof =
  | {
      ok: true;
      batches: ProvedBatch[];
      /** The trip after all the batches. */
      trip: Trip;
    }
  | { ok: false; reason: string };

/**
 * Applies the batches in order, each one whole on the trip with the batches
 * before it, as the save queue does. The proof fails at the first
 * op that does not apply, with the reason.
 */
export function proveBatches(trip: Trip, batches: readonly RawBatch[]): Proof {
  let state = trip;
  const proved: ProvedBatch[] = [];
  for (const [b, batch] of batches.entries()) {
    const where = `Batch ${String(b + 1)}`;
    if (batch.ops.length === 0) {
      return { ok: false, reason: `${where} has no ops.` };
    }
    const ops: DraftOp[] = [];
    for (const [o, raw] of batch.ops.entries()) {
      const read = readOp(raw);
      if (typeof read === "string") {
        return {
          ok: false,
          reason: `${where}, op ${String(o + 1)} (${String(raw.op)}): ${read}`,
        };
      }
      ops.push(read);
    }
    const sent = withExpect(state, ops);
    const result = applyOps(state, sent);
    if (result.status === "refused") {
      return {
        ok: false,
        reason: `${where}, op ${String(result.index + 1)} (${ops[result.index].op}): ${result.reason}`,
      };
    }
    if (result.status === "conflict") {
      return {
        ok: false,
        reason: `${where}, op ${String(result.index + 1)} (${ops[result.index].op}): the thing that it changes, ${namedId(ops[result.index])}, is not in the trip at that op.`,
      };
    }
    const stray = strayBefore(state, result.trip, ops);
    if (stray) {
      return {
        ok: false,
        reason: `${where}, op ${String(stray.index + 1)} (${ops[stray.index].op}): "before" is "${stray.before}", which is not in the same ${stray.list}. Name a thing of that ${stray.list}, or leave "before" out to put it last.`,
      };
    }
    proved.push({
      dayIds: changedDays(state, result.trip, ops),
      summary: batch.summary,
      ops,
      sent,
    });
    state = result.trip;
  }
  return { ok: true, batches: proved, trip: state };
}

/**
 * The first add or move of a moment or an item whose `before` is not in the
 * day or list where the thing goes. `applyOps` puts such a thing last; from
 * the model it means that it mixed up two days.
 */
function strayBefore(
  before: Trip,
  after: Trip,
  ops: readonly DraftOp[],
): { index: number; before: string; list: "day" | "list" } | null {
  for (const [index, op] of ops.entries()) {
    if (op.op === "addMoment" || op.op === "moveMoment") {
      if (op.before === undefined) continue;
      const moment = findMoment(
        after,
        op.op === "addMoment" ? op.moment.id : op.id,
      );
      const next =
        findMoment(after, op.before) ?? findMoment(before, op.before);
      if (moment && next?.day.id !== moment.day.id) {
        return { index, before: op.before, list: "day" };
      }
    }
    if (op.op === "addItem" || op.op === "moveItem") {
      if (op.before === undefined) continue;
      const item = findItem(after, op.op === "addItem" ? op.item.id : op.id);
      const next = findItem(after, op.before) ?? findItem(before, op.before);
      if (item && JSON.stringify(next?.place) !== JSON.stringify(item.place)) {
        return { index, before: op.before, list: "list" };
      }
    }
  }
  return null;
}

/** The op, checked as `applyOps` checks it but with no `expect`, or why it is not an op. */
function readOp(raw: Record<string, unknown>): DraftOp | string {
  const draft = { ...raw };
  // The model can send an `expect`. The server adds the correct one.
  Reflect.deleteProperty(draft, "expect");
  const parsed = draftOpSchema.safeParse(draft);
  return parsed.success ? parsed.data : issueText(parsed.error);
}

function namedId(op: DraftOp): string {
  const ids = [
    "id" in op ? op.id : undefined,
    "personId" in op ? op.personId : undefined,
    "dayId" in op ? op.dayId : undefined,
  ].filter((id) => id !== undefined);
  return ids.length === 0
    ? "the trip"
    : ids.map((id) => `"${id}"`).join(" on ");
}

/**
 * The days that are new, gone, or hold other plans or people. A day keeps
 * its date while the plans of days move between dates, so a move of a day
 * changes the date of each day that it passes; the other ops that change
 * dates (`addDay`, `removeDay`, `setFirstDate`) move every later day, and
 * those days are not named for it.
 */
function changedDays(
  before: Trip,
  after: Trip,
  ops: readonly DraftOp[],
): string[] {
  const movesDays = ops.some((op) => op.op === "moveDay");
  const old = new Map(before.days.map((day) => [day.id, day]));
  const changed = new Set<string>();
  for (const day of after.days) {
    const was = old.get(day.id);
    if (
      !was ||
      plansOf(was) !== plansOf(day) ||
      (movesDays && was.date !== day.date)
    ) {
      changed.add(day.id);
    }
  }
  for (const person of after.people) {
    const was = before.people.find((each) => each.id === person.id);
    for (const day of after.days) {
      if (was?.days[day.id] !== person.days[day.id]) changed.add(day.id);
    }
  }
  const kept = new Set(after.days.map((day) => day.id));
  return [
    ...after.days.filter((day) => changed.has(day.id)).map((day) => day.id),
    ...before.days.filter((day) => !kept.has(day.id)).map((day) => day.id),
  ];
}

function plansOf(day: Day): string {
  return JSON.stringify({ ...day, date: null });
}
