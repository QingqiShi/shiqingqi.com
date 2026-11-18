import "server-only";
import { z } from "zod";
import { changes, type Decision } from "#src/assistant/store/changes.ts";
import { messages } from "#src/assistant/store/messages.ts";
import type { RefusalReason } from "#src/assistant/types.ts";
import type { TripsDb } from "#src/db/types.ts";
import { asViewer, type Transaction } from "#src/trips/as-viewer.ts";
import { withExpect } from "#src/trips/ops/apply-ops.ts";
import { invertOps } from "#src/trips/ops/invert-ops.ts";
import { opSchema } from "#src/trips/ops/op-schema.ts";
import { retrySaves, writeTrips } from "#src/trips/write-trips.ts";
import { segmentMessages, type SegmentEvent } from "./segment-messages.ts";
import { tripView } from "./trip-view.ts";

export type ChangeOutcome =
  /** Done. `version` is the trip's version after a change to it. */
  | { status: "done"; version?: string }
  /** No such change of the viewer, or it is not in a state for this, such as a second accept. */
  | { status: "not_allowed" }
  /**
   * The trip changed since, in a thing that the change touches. A
   * proposal is then refused for good; an undo stays possible to try again.
   */
  | { status: "conflict" }
  /** The assistant is answering in that conversation. Try again when its turn ends. */
  | { status: "busy" };

/** An outcome of one step, with why an accept could not apply. */
type StepOutcome =
  | Exclude<ChangeOutcome, { status: "conflict" }>
  | { status: "conflict"; reason: RefusalReason };

class Abort extends Error {
  readonly outcome: StepOutcome;
  constructor(outcome: StepOutcome) {
    super(outcome.status);
    this.outcome = outcome;
  }
}

function summaryOf(card: unknown): string {
  if (typeof card === "object" && card !== null && "summary" in card) {
    return String(card.summary);
  }
  return "the change";
}

async function addEvent(
  tx: Transaction,
  conversationId: string,
  event: SegmentEvent,
): Promise<void> {
  const added = await messages.append(tx, conversationId, null, [
    segmentMessages.eventEntry(event),
  ]);
  if (added === null) throw new Abort({ status: "busy" });
}

/**
 * Moves a change of the viewer on, applies what that needs to the trip, and
 * adds an event for the model, all in one transaction: when any part fails,
 * nothing of it stays.
 */
async function decideAndApply(
  db: TripsDb,
  userId: string,
  changeId: string,
  decision: Decision,
  event: (summary: string, version: string | undefined) => string,
  reason?: RefusalReason,
): Promise<StepOutcome> {
  try {
    return await retrySaves(() =>
      asViewer(db, userId, async (tx) => {
        const stored = await changes.get(tx, changeId);
        if (!stored) return { status: "not_allowed" };
        const decided = await changes.decide(tx, changeId, decision);
        if (!decided) return { status: "not_allowed" };
        const ops =
          decision === "accept"
            ? decided.ops
            : decision === "undo"
              ? decided.inverseOps
              : null;
        let version: string | undefined;
        if (ops !== null) {
          if (!decided.tripId) throw new Abort({ status: "not_allowed" });
          const sent = z.array(opSchema).parse(ops);
          const result = await writeTrips.changeIn(tx, decided.tripId, sent);
          if (result.status === "conflict") {
            throw new Abort({ status: "conflict", reason: "trip_changed" });
          }
          if (result.status === "refused" && decision === "accept") {
            throw new Abort({ status: "conflict", reason: "no_longer_fits" });
          }
          if (result.status !== "applied") {
            throw new Abort({ status: "not_allowed" });
          }
          version = tripView.version(result.trip);
          if (decision === "accept") {
            const inverse = invertOps(result.before, sent);
            const set = await changes.setResult(
              tx,
              changeId,
              result.revision,
              inverse.length > 0 ? withExpect(result.trip, inverse) : null,
            );
            if (!set) throw new Abort({ status: "not_allowed" });
          }
        }
        await addEvent(tx, stored.conversationId, {
          type: "change",
          changeId,
          decision:
            decision === "accept"
              ? "accepted"
              : decision === "skip"
                ? "skipped"
                : decision === "undo"
                  ? "undone"
                  : "refused",
          ...(reason !== undefined && { reason }),
          text: event(summaryOf(stored.card), version),
        });
        return { status: "done", ...(version !== undefined && { version }) };
      }),
    );
  } catch (error) {
    if (error instanceof Abort) return error.outcome;
    throw error;
  }
}

/**
 * Saves a proposal that the viewer accepts: only the ops that the server
 * stored for it, under the viewer's name. A second accept does nothing.
 * When the trip changed since in a thing that the proposal touches, the
 * proposal is refused, and the model reads that it could not apply.
 */
async function acceptProposal(
  db: TripsDb,
  userId: string,
  changeId: string,
): Promise<ChangeOutcome> {
  const outcome = await decideAndApply(
    db,
    userId,
    changeId,
    "accept",
    (summary, version) =>
      `The person accepted the proposal "${summary}", and it is saved. The trip is now version ${version ?? "unknown"}.`,
  );
  if (outcome.status !== "conflict") return outcome;
  const refused = await decideAndApply(
    db,
    userId,
    changeId,
    "refuse",
    (summary) =>
      outcome.reason === "trip_changed"
        ? `The proposal "${summary}" could not be saved, because the trip changed since in what it changes. Nothing changed.`
        : `The proposal "${summary}" could not be saved, because its changes no longer apply to the trip as it is now. Nothing changed.`,
    outcome.reason,
  );
  return refused.status === "done" ? { status: "conflict" } : plain(refused);
}

function plain(outcome: StepOutcome): ChangeOutcome {
  return outcome.status === "conflict" ? { status: "conflict" } : outcome;
}

/** Puts a proposal or a card of the viewer aside, with no change to the trip. */
async function skipProposal(
  db: TripsDb,
  userId: string,
  changeId: string,
): Promise<ChangeOutcome> {
  return plain(
    await decideAndApply(
      db,
      userId,
      changeId,
      "skip",
      (summary) =>
        `The person skipped the proposal "${summary}". Nothing changed.`,
    ),
  );
}

/**
 * Takes back a change that the assistant saved or a proposal that the
 * viewer accepted, with the inverse ops that the server stored. When a
 * thing that it touches changed since, nothing changes, and the change
 * can still be undone later.
 */
async function undoChange(
  db: TripsDb,
  userId: string,
  changeId: string,
): Promise<ChangeOutcome> {
  return plain(
    await decideAndApply(
      db,
      userId,
      changeId,
      "undo",
      (summary, version) =>
        `The person undid the change "${summary}". The trip is now version ${version ?? "unknown"}.`,
    ),
  );
}

/**
 * What the person does with a change of the assistant: accept or skip a
 * proposal, undo a saved change. Each runs as the person and adds an event
 * to the conversation, which the model reads in the next turn.
 */
export const changeService = {
  accept: acceptProposal,
  skip: skipProposal,
  undo: undoChange,
};
