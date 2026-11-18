import { and, desc, eq, isNull, sql } from "drizzle-orm";
import "server-only";
import { assistantConversations } from "#src/db/schema.ts";
import type { Transaction } from "#src/trips/as-viewer.ts";
import { callFunction } from "./call-function.ts";

export interface Conversation {
  id: string;
  tripId: string | null;
  startedAt: Date;
  /** Null until the first model message. */
  lastMessageAt: Date | null;
  /** Null while the segment is open. */
  endedAt: Date | null;
  summary: string | null;
  summaryAt: Date | null;
  /** A turn holds the segment now. */
  turnRunning: boolean;
}

const conversationColumns = {
  id: assistantConversations.id,
  tripId: assistantConversations.tripId,
  startedAt: assistantConversations.startedAt,
  lastMessageAt: assistantConversations.lastMessageAt,
  endedAt: assistantConversations.endedAt,
  summary: assistantConversations.summary,
  summaryAt: assistantConversations.summaryAt,
  turnRunning: sql<boolean>`coalesce(${assistantConversations.turnExpiresAt} > pg_catalog.clock_timestamp(), false)`,
};

async function get(
  tx: Transaction,
  conversationId: string,
): Promise<Conversation | null> {
  const rows = await tx
    .select(conversationColumns)
    .from(assistantConversations)
    .where(
      and(
        eq(assistantConversations.id, conversationId),
        eq(assistantConversations.userId, sql`public.trips_viewer_id()`),
      ),
    );
  return rows.at(0) ?? null;
}

async function conversationFrom(tx: Transaction, id: string | null) {
  return id === null ? null : get(tx, id);
}

/**
 * The viewer's open segment in the trip, which this makes when there is
 * none. The caller decides from `lastMessageAt` whether it is too old, and
 * then calls `start`. Null when the viewer cannot change the trip.
 */
async function current(
  tx: Transaction,
  tripId: string,
): Promise<Conversation | null> {
  const id = await callFunction<string | null>(
    tx,
    sql`public.assistant_current_conversation(${tripId}::uuid)`,
  );
  return conversationFrom(tx, id);
}

/**
 * Ends the viewer's open segment in the trip and starts a new one. With a
 * null trip, starts a conversation for a trip that is not made yet. Null
 * when the viewer cannot change the trip.
 */
async function start(
  tx: Transaction,
  tripId: string | null,
): Promise<Conversation | null> {
  const id = await callFunction<string | null>(
    tx,
    sql`public.assistant_start_conversation(${tripId}::uuid)`,
  );
  return conversationFrom(tx, id);
}

/** False when the segment is not the viewer's or is not open. */
function end(tx: Transaction, conversationId: string): Promise<boolean> {
  return callFunction(
    tx,
    sql`public.assistant_end_conversation(${conversationId}::uuid)`,
  );
}

/**
 * Opens an ended segment again, to go on with it, and ends the segment that
 * was open in its trip. Its summary stays until `saveSummary` replaces it.
 */
function reopen(tx: Transaction, conversationId: string): Promise<boolean> {
  return callFunction(
    tx,
    sql`public.assistant_reopen_conversation(${conversationId}::uuid)`,
  );
}

/** Writes the summary of a segment, in place of any before. At most 8000 characters. */
function saveSummary(
  tx: Transaction,
  conversationId: string,
  summary: string,
): Promise<boolean> {
  return callFunction(
    tx,
    sql`public.assistant_save_summary(${conversationId}::uuid, ${summary})`,
  );
}

/**
 * The viewer's segments in a trip, or with a null trip the conversations
 * that have no trip yet, the newest first.
 */
function list(
  tx: Transaction,
  tripId: string | null,
  limit = 50,
): Promise<Conversation[]> {
  return tx
    .select(conversationColumns)
    .from(assistantConversations)
    .where(
      and(
        eq(assistantConversations.userId, sql`public.trips_viewer_id()`),
        tripId === null
          ? isNull(assistantConversations.tripId)
          : eq(assistantConversations.tripId, tripId),
      ),
    )
    .orderBy(desc(assistantConversations.startedAt))
    .limit(limit);
}

/**
 * Takes the viewer's turn in the trip of an open segment for `seconds`
 * (1 to 3600), and gives the id of the turn. Null while another turn of the
 * viewer in the same trip holds it. A turn that is not released frees
 * itself when its time ends, so give a little more than the longest turn.
 */
function takeTurn(
  tx: Transaction,
  conversationId: string,
  seconds: number,
): Promise<string | null> {
  return callFunction(
    tx,
    sql`public.assistant_take_turn(${conversationId}::uuid, ${Math.round(seconds)}::integer)`,
  );
}

function releaseTurn(
  tx: Transaction,
  conversationId: string,
  turnId: string,
): Promise<boolean> {
  return callFunction(
    tx,
    sql`public.assistant_release_turn(${conversationId}::uuid, ${turnId}::uuid)`,
  );
}

/**
 * Puts a conversation that has no trip, with its changes, in the trip that
 * it made, as the viewer's open segment there.
 */
function attach(
  tx: Transaction,
  conversationId: string,
  tripId: string,
): Promise<boolean> {
  return callFunction(
    tx,
    sql`public.assistant_attach_conversation(${conversationId}::uuid, ${tripId}::uuid)`,
  );
}

/**
 * The viewer's conversation segments. Each function takes a transaction of
 * `asViewer`, so that the caller can join it with other writes, such as a
 * save of the trip. Row-level security and the functions of
 * `drizzle/0009_assistant.sql` limit it to the viewer's own rows.
 */
export const conversations = {
  get,
  current,
  start,
  end,
  reopen,
  saveSummary,
  list,
  takeTurn,
  releaseTurn,
  attach,
};
