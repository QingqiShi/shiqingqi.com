import type { BatchCheck, Decision } from "./check-batches.ts";

/** A decision of the person. `batchId` is the change of the queue that an accepted batch is. */
export interface Decided {
  decision: Decision;
  batchId?: number;
}

/**
 * Why an accepted batch is not in the trip any more: the person took it
 * back, or the queue did not save it.
 */
export type Returned = "takenBack" | "notSaved";

/**
 * Moves each accepted batch whose change the trip no longer has from
 * `decided` to `returned`. It gives the same maps when no batch moves.
 */
export function takeBack(
  decided: ReadonlyMap<number, Decided>,
  returned: ReadonlyMap<number, Returned>,
  batchIds: ReadonlySet<number>,
  wasUndone: (batchId: number) => boolean,
): {
  decided: ReadonlyMap<number, Decided>;
  returned: ReadonlyMap<number, Returned>;
} {
  const gone = [...decided].filter(
    ([, { batchId }]) => batchId !== undefined && batchIds.has(batchId),
  );
  if (gone.length === 0) return { decided, returned };
  const nextDecided = new Map(decided);
  const nextReturned = new Map(returned);
  for (const [index, { batchId }] of gone) {
    nextDecided.delete(index);
    nextReturned.set(
      index,
      batchId !== undefined && wasUndone(batchId) ? "takenBack" : "notSaved",
    );
  }
  return { decided: nextDecided, returned: nextReturned };
}

/** What became of the batches of an answer, for the prompt to say. */
export type AnswerStatus =
  /** Batches that the person can accept and has not decided about. */
  | { kind: "waits"; count: number }
  /** Nothing waits, and the person can still look at what did not go in. */
  | {
      kind: "settled";
      accepted: number;
      skipped: number;
      takenBack: number;
      notSaved: number;
      /** Batches with no decision that no longer fit the trip. */
      outdated: number;
    };

/**
 * The batches that wait for a decision of the person: each one that the
 * trip can take, with no decision, and that the person did not take back.
 */
export function openBatches(
  checks: readonly (BatchCheck | null)[],
  returned: ReadonlyMap<number, Returned>,
): number[] {
  return checks.flatMap((check, index) =>
    check && check.state !== "stale" && !returned.has(index) ? [index] : [],
  );
}

/**
 * What the prompt says about an answer. A batch that the person took back,
 * or that was not saved, does not wait: the person decided about it once.
 * Null when there is nothing to say: no batch, the person dismissed it, or
 * each batch is in the trip.
 */
export function answerStatus(
  checks: readonly (BatchCheck | null)[],
  decided: ReadonlyMap<number, Decided>,
  returned: ReadonlyMap<number, Returned>,
  isDismissed: boolean,
): AnswerStatus | null {
  const open = openBatches(checks, returned);
  if (open.length > 0) return { kind: "waits", count: open.length };
  const decisions = [...decided.values()].map(({ decision }) => decision);
  const reasons = [...returned.values()];
  const status = {
    kind: "settled",
    accepted: decisions.filter((each) => each === "accepted").length,
    skipped: decisions.filter((each) => each === "skipped").length,
    takenBack: reasons.filter((each) => each === "takenBack").length,
    notSaved: reasons.filter((each) => each === "notSaved").length,
    outdated: checks.filter(
      (check, index) => check?.state === "stale" && !returned.has(index),
    ).length,
  } as const;
  const leftOut =
    status.skipped + status.takenBack + status.notSaved + status.outdated;
  return leftOut === 0 || isDismissed ? null : status;
}
