import { asc, eq, sql } from "drizzle-orm";
import "server-only";
import {
  assistantChanges,
  type assistantChangeKinds,
  type assistantChangeStatuses,
} from "#src/db/schema.ts";
import type { Transaction } from "#src/trips/as-viewer.ts";
import { callFunction, jsonb } from "./call-function.ts";

export type ChangeKind = (typeof assistantChangeKinds)[number];
export type ChangeStatus = (typeof assistantChangeStatuses)[number];

/**
 * - `applied` starts as `applied`, or `refused` when the server refused it.
 * - `proposal` and `research` start as `pending`.
 * - An action of a research card is an `applied` change with `parentId` and
 *   `actionKey`; the same action of the same card is recorded once.
 */
export type NewChange =
  | {
      kind: "applied";
      status: "applied" | "refused";
      ops: unknown;
      inverseOps?: unknown;
      revision?: number | null;
      card?: unknown;
      parentId?: string;
      actionKey?: string;
      toolCallId?: string | null;
    }
  | {
      kind: "proposal";
      ops: unknown;
      card?: unknown;
      toolCallId?: string | null;
    }
  | {
      kind: "research";
      card: unknown;
      toolCallId?: string | null;
    };

export interface StoredChange {
  id: string;
  conversationId: string;
  tripId: string | null;
  kind: ChangeKind;
  status: ChangeStatus;
  ops: unknown;
  inverseOps: unknown;
  revision: number | null;
  card: unknown;
  parentId: string | null;
  actionKey: string | null;
  toolCallId: string | null;
  decidedAt: Date | null;
  createdAt: Date;
}

/**
 * Records a change in a segment of the viewer and gives its id. Null for a
 * segment that is not the viewer's, for a trip that the viewer cannot
 * change, for a research card that is not pending, and for an action of a
 * card that is recorded already: then roll back anything that the caller
 * applied in the same transaction.
 */
function record(
  tx: Transaction,
  conversationId: string,
  change: NewChange,
): Promise<string | null> {
  const status = change.kind === "applied" ? change.status : "pending";
  const ops = change.kind === "research" ? null : change.ops;
  const applied = change.kind === "applied" ? change : null;
  return callFunction(
    tx,
    sql`public.assistant_record_change(${conversationId}::uuid, ${change.kind}, ${status}, ${jsonb(ops)}, ${jsonb(applied?.inverseOps)}, ${applied?.revision ?? null}::integer, ${jsonb(change.card)}, ${applied?.parentId ?? null}::uuid, ${applied?.actionKey ?? null}, ${change.toolCallId ?? null})`,
  );
}

export type Decision = "accept" | "skip" | "refuse" | "undo";

export interface DecidedChange {
  status: ChangeStatus;
  tripId: string | null;
  /** The ops to apply for `accept`, as the server stored them. */
  ops: unknown;
  /** The ops to apply for `undo`. */
  inverseOps: unknown;
}

/**
 * Moves a change of the viewer to its next status, under a lock of its row:
 * - accept: a pending proposal becomes `accepted`;
 * - skip: a pending proposal or research card becomes `skipped`;
 * - refuse: a pending proposal becomes `refused`;
 * - undo: an `applied` change or an `accepted` proposal that has inverse
 *   ops becomes `undone`.
 *
 * Null when the move is not allowed, such as a second accept. Apply the
 * returned ops in the same transaction, then `setResult` for an
 * accept; when the apply fails, roll the transaction back so that the
 * status goes back too.
 */
function decide(
  tx: Transaction,
  changeId: string,
  decision: Decision,
): Promise<DecidedChange | null> {
  return callFunction(
    tx,
    sql`public.assistant_decide_change(${changeId}::uuid, ${decision})`,
  );
}

/** Stores the revision and the inverse ops of an applied or accepted change, once. */
function setResult(
  tx: Transaction,
  changeId: string,
  revision: number,
  inverseOps: unknown,
): Promise<boolean> {
  return callFunction(
    tx,
    sql`public.assistant_set_change_result(${changeId}::uuid, ${revision}::integer, ${jsonb(inverseOps)})`,
  );
}

const changeColumns = {
  id: assistantChanges.id,
  conversationId: assistantChanges.conversationId,
  tripId: assistantChanges.tripId,
  kind: assistantChanges.kind,
  status: assistantChanges.status,
  ops: assistantChanges.ops,
  inverseOps: assistantChanges.inverseOps,
  revision: assistantChanges.revision,
  card: assistantChanges.card,
  parentId: assistantChanges.parentId,
  actionKey: assistantChanges.actionKey,
  toolCallId: assistantChanges.toolCallId,
  decidedAt: assistantChanges.decidedAt,
  createdAt: assistantChanges.createdAt,
};

/** The changes of a segment of the viewer, the oldest first. */
function list(
  tx: Transaction,
  conversationId: string,
): Promise<StoredChange[]> {
  return tx
    .select(changeColumns)
    .from(assistantChanges)
    .where(eq(assistantChanges.conversationId, conversationId))
    .orderBy(asc(assistantChanges.createdAt), asc(assistantChanges.id));
}

async function get(
  tx: Transaction,
  changeId: string,
): Promise<StoredChange | null> {
  const rows = await tx
    .select(changeColumns)
    .from(assistantChanges)
    .where(eq(assistantChanges.id, changeId));
  return rows.at(0) ?? null;
}

/**
 * What the assistant changed or offered, of the viewer. Each function takes
 * a transaction of `asViewer`; apply the ops of a change in the same one.
 */
export const changes = { record, decide, setResult, list, get };
