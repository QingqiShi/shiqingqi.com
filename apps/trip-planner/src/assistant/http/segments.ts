import type { LanguageModel } from "ai";
import "server-only";
import {
  conversations,
  type Conversation,
} from "#src/assistant/store/conversations.ts";
import type { TripsDb } from "#src/db/types.ts";
import { asViewer, type Transaction } from "#src/trips/as-viewer.ts";
import { segmentSummary } from "./segment-summary.ts";

/** After this long with no message, the next message starts a new segment. */
export const SEGMENT_IDLE_MS = 4 * 60 * 60 * 1000;
const RECENT_SEGMENTS = 50;

export type SegmentResult =
  | { status: "ok"; segment: Conversation }
  /** The person cannot change the trip, or has no such segment. */
  | { status: "not_found" }
  /** A turn of the person runs in this trip. */
  | { status: "busy" };

/**
 * When the open segment last moved: its last message, or the time that
 * the person went to it from another segment (reopen ends the one before,
 * so that its end is that time). A reopened old segment is thus fresh.
 */
function lastActive(open: Conversation, all: readonly Conversation[]): number {
  return Math.max(
    open.lastMessageAt?.getTime() ?? open.startedAt.getTime(),
    ...all.map((each) => each.endedAt?.getTime() ?? 0),
  );
}

/**
 * Ends `open` with its summary and starts a new segment, unless another
 * request did so first: then that request's segment is the answer.
 */
async function replace(
  db: TripsDb,
  userId: string,
  tripId: string,
  open: Conversation,
  model: LanguageModel | null,
): Promise<SegmentResult> {
  await segmentSummary.write(db, userId, open, model);
  return asViewer(db, userId, async (tx) => {
    const current = await conversations.current(tx, tripId);
    if (!current) return { status: "not_found" } as const;
    if (current.id !== open.id) return { status: "ok", segment: current };
    if (current.turnRunning) return { status: "busy" } as const;
    const started = await conversations.start(tx, tripId);
    return started
      ? { status: "ok", segment: started }
      : ({ status: "not_found" } as const);
  });
}

/**
 * The segment that a new message of the person goes to: the open one, or,
 * when that has been still for `SEGMENT_IDLE_MS`, a new one after the
 * summary of the old one is written.
 */
async function forMessage(
  db: TripsDb,
  userId: string,
  tripId: string,
  now: Date,
  model: LanguageModel | null,
): Promise<SegmentResult> {
  const found = await asViewer(db, userId, async (tx) => {
    const open = await conversations.current(tx, tripId);
    if (!open) return null;
    const all = await conversations.list(tx, tripId, RECENT_SEGMENTS);
    return { open, all };
  });
  if (!found) return { status: "not_found" };
  const { open, all } = found;
  const stale =
    open.lastMessageAt !== null &&
    !open.turnRunning &&
    now.getTime() - lastActive(open, all) >= SEGMENT_IDLE_MS;
  if (!stale) return { status: "ok", segment: open };
  return replace(db, userId, tripId, open, model);
}

/** Ends the open segment with its summary and starts a clean one. An open segment with no message stays. */
async function startNew(
  db: TripsDb,
  userId: string,
  tripId: string,
  model: LanguageModel | null,
): Promise<SegmentResult> {
  const open = await asViewer(db, userId, (tx) =>
    conversations.current(tx, tripId),
  );
  if (!open) return { status: "not_found" };
  if (open.turnRunning) return { status: "busy" };
  if (open.lastMessageAt === null) return { status: "ok", segment: open };
  return replace(db, userId, tripId, open, model);
}

/** Goes on with an earlier segment; the open one ends with its summary. */
async function reopen(
  db: TripsDb,
  userId: string,
  conversationId: string,
  model: LanguageModel | null,
): Promise<SegmentResult> {
  const found = await asViewer(db, userId, async (tx) => {
    const segment = await conversations.get(tx, conversationId);
    if (!segment?.tripId) return null;
    const open = (await conversations.list(tx, segment.tripId)).find(
      (each) => each.endedAt === null,
    );
    return { segment, open };
  });
  if (!found) return { status: "not_found" };
  const { segment, open } = found;
  if (open?.id === segment.id) return { status: "ok", segment };
  if (open?.turnRunning) return { status: "busy" };
  if (open) await segmentSummary.write(db, userId, open, model);
  return asViewer(db, userId, async (tx) => {
    const reopened = await conversations.reopen(tx, conversationId);
    const now = reopened ? await conversations.get(tx, conversationId) : null;
    return now ? { status: "ok", segment: now } : { status: "not_found" };
  });
}

/** Whether a conversation that starts a new trip is still the one to go on with. */
function isFresh(open: Conversation, now: Date): boolean {
  return (
    open.turnRunning ||
    now.getTime() - (open.lastMessageAt ?? open.startedAt).getTime() <
      SEGMENT_IDLE_MS
  );
}

/**
 * The person's open conversation that starts a new trip, when it moved in
 * the last `SEGMENT_IDLE_MS`, without making one. The newest open one counts.
 */
async function openForNewTrip(
  tx: Transaction,
  now: Date,
): Promise<Conversation | null> {
  const open = (await conversations.list(tx, null, RECENT_SEGMENTS)).find(
    (each) => each.endedAt === null,
  );
  return open && isFresh(open, now) ? open : null;
}

/**
 * The conversation that a message on New trip goes to: the fresh open one,
 * or a new one. Open ones that went still end; they need no summary, as no
 * trip takes it.
 */
async function forNewTrip(
  db: TripsDb,
  userId: string,
  now: Date,
): Promise<SegmentResult> {
  return asViewer(db, userId, async (tx) => {
    const fresh = await openForNewTrip(tx, now);
    if (fresh) return { status: "ok", segment: fresh } as const;
    for (const each of await conversations.list(tx, null, RECENT_SEGMENTS)) {
      if (each.endedAt === null && !each.turnRunning) {
        await conversations.end(tx, each.id);
      }
    }
    const started = await conversations.start(tx, null);
    return started
      ? ({ status: "ok", segment: started } as const)
      : ({ status: "not_found" } as const);
  });
}

/** The person's segments of the assistant in a trip, and when one ends and the next starts. */
export const segments = {
  forMessage,
  startNew,
  reopen,
  forNewTrip,
  openForNewTrip,
};
