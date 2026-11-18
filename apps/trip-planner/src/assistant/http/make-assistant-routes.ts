import type { SupportedLocale } from "@tuja/i18n/types";
import { describeError } from "@tuja/server-db/describe-error";
import type { LanguageModel } from "ai";
import { and, eq, sql } from "drizzle-orm";
import "server-only";
import { z } from "zod";
import { changeService } from "#src/assistant/agent/change-service.ts";
import { MAX_MEMORY_FILE_CHARS } from "#src/assistant/agent/memory-tool.ts";
import type {
  Reader,
  ReaderFile,
} from "#src/assistant/agent/reader/reader-agent.ts";
import { cardActions } from "#src/assistant/agent/research/card-actions.ts";
import type { Researcher } from "#src/assistant/agent/research/research-agent.ts";
import { CARD_ACTIONS } from "#src/assistant/agent/research/research-cards.ts";
import { runTurn } from "#src/assistant/agent/run-turn.ts";
import { segmentMessages } from "#src/assistant/agent/segment-messages.ts";
import { tripView } from "#src/assistant/agent/trip-view.ts";
import type { TripSkill } from "#src/assistant/skills/get-trip-skills.ts";
import { changes } from "#src/assistant/store/changes.ts";
import {
  conversations,
  type Conversation,
} from "#src/assistant/store/conversations.ts";
import {
  memories,
  type Memory,
  type MemoryScope,
} from "#src/assistant/store/memories.ts";
import { messages } from "#src/assistant/store/messages.ts";
import type {
  AssistantState,
  MemoryFile,
  MemoryLists,
  SegmentInfo,
  SegmentTranscript,
  StreamLine,
} from "#src/assistant/types.ts";
import { json, requireUserId } from "#src/auth/signed-in-route.ts";
import { users } from "#src/db/auth-schema.ts";
import { tripMembers } from "#src/db/schema.ts";
import type { TripsDb } from "#src/db/types.ts";
import { asViewer, type Transaction } from "#src/trips/as-viewer.ts";
import { canEditTrip } from "#src/trips/can-edit-trip.ts";
import { dayNumber } from "#src/trips/day-number.ts";
import { entityId } from "#src/trips/trip-schema.ts";
import { readSendBody } from "./read-send-body.ts";
import { segments, type SegmentResult } from "./segments.ts";
import { transcript } from "./transcript.ts";

/** The time of a turn, with the summary before it, under the send route's `maxDuration` of 300 s. */
const SEND_BUDGET_MS = 280_000;

export interface AssistantRouteDeps {
  getDb: () => TripsDb;
  /** The model of segment summaries, or null when none is set up. */
  summaryModel: () => LanguageModel | null;
  /** The model of turns; undefined for the assistant's own. */
  turnModel: () => LanguageModel | undefined;
  /** The research sub-agent of turns; undefined for the assistant's own. */
  researcher?: () => Researcher | undefined;
  /** The reader sub-agent of attachments; undefined for the assistant's own. */
  reader?: () => Reader | undefined;
  /** The skills of turns; undefined for the trip skills of the Anthropic account. */
  skills?: () => Promise<readonly TripSkill[]>;
  /** Keeps the server alive for a task after the answer, such as `after`. */
  afterResponse: (task: () => Promise<unknown>) => void;
  now: () => Date;
}

const tripBody = z.strictObject({ tripId: z.uuid() });
const conversationBody = z.strictObject({ conversationId: z.uuid() });
const scopeName = z.enum(["trip", "personal"]);
const memoryPath = z.string().min(1).max(200);

const notFound = () => json({ error: "not_found" }, 404);
const busy = () => json({ error: "busy" }, 409);
const serverError = () =>
  new Response(null, { status: 500, headers: { "Cache-Control": "no-store" } });

async function roleIn(tx: Transaction, tripId: string) {
  const rows = await tx
    .select({ role: tripMembers.role })
    .from(tripMembers)
    .where(
      and(
        eq(tripMembers.tripId, tripId),
        eq(tripMembers.userId, sql`public.trips_viewer_id()`),
      ),
    );
  return rows.at(0)?.role ?? null;
}

async function canEditIn(tx: Transaction, tripId: string) {
  const role = await roleIn(tx, tripId);
  return role !== null && canEditTrip(role);
}

function segmentInfo(segment: Conversation): SegmentInfo {
  return {
    id: segment.id,
    startedAt: segment.startedAt.toISOString(),
    lastMessageAt: segment.lastMessageAt?.toISOString() ?? null,
    endedAt: segment.endedAt?.toISOString() ?? null,
    summary: segment.summary,
  };
}

function memoryFile(memory: Memory): MemoryFile {
  return { ...memory, updatedAt: memory.updatedAt.toISOString() };
}

async function transcriptOf(tx: Transaction, conversationId: string) {
  const [entries, changeRows] = await Promise.all([
    segmentMessages.read(tx, conversationId),
    changes.list(tx, conversationId),
  ]);
  return {
    transcript: transcript.build(entries, changeRows),
    links: transcript.links(changeRows),
  };
}

/** The open segment of the person in a trip, without making one. Null for a person who cannot change the trip. */
function readState(
  db: TripsDb,
  userId: string,
  tripId: string,
): Promise<AssistantState | null> {
  return asViewer(db, userId, async (tx) => {
    if (!(await canEditIn(tx, tripId))) return null;
    const trip = await tripView.read(tx, tripId);
    if (!trip) return null;
    const open = (await conversations.list(tx, tripId)).find(
      (each) => each.endedAt === null,
    );
    const shown = open
      ? await transcriptOf(tx, open.id)
      : { transcript: [], links: [] };
    return {
      segment: open ? segmentInfo(open) : null,
      ...shown,
      running: open?.turnRunning ?? false,
      version: tripView.version(trip),
      days: trip.days.map((day, index) => ({
        id: day.id,
        number: dayNumber(trip, index),
        date: day.date,
      })),
    };
  });
}

/** The person's open conversation that starts a new trip, without making one. */
function readNewTripState(
  db: TripsDb,
  userId: string,
  now: Date,
): Promise<AssistantState> {
  return asViewer(db, userId, async (tx) => {
    const open = await segments.openForNewTrip(tx, now);
    const shown = open
      ? await transcriptOf(tx, open.id)
      : { transcript: [], links: [] };
    return {
      segment: open ? segmentInfo(open) : null,
      ...shown,
      running: open?.turnRunning ?? false,
      version: null,
      days: [],
    };
  });
}

class TurnRunning extends Error {}

/** The result of `write`, or `busy` when a turn holds the conversation, and then nothing of it stays. */
async function whileNoTurn<T>(write: () => Promise<T>): Promise<T | "busy"> {
  try {
    return await write();
  } catch (error) {
    if (error instanceof TurnRunning) return "busy";
    throw error;
  }
}

const MEMORY_DIRECTORIES = {
  trip: "/memories/trip",
  personal: "/memories/me",
} as const;

/**
 * Tells the model, in the person's open conversation in the trip, that the
 * person changed or deleted a memory file, so that it does not write the
 * same again from the conversation. A memory path has no `<` or `>`.
 */
async function tellAssistant(
  tx: Transaction,
  tripId: string,
  scope: "trip" | "personal",
  path: string,
  action: "changed" | "deleted",
): Promise<void> {
  const open = (await conversations.list(tx, tripId)).find(
    (each) => each.endedAt === null,
  );
  if (!open) return;
  const file = `${MEMORY_DIRECTORIES[scope]}/${path}`;
  const text =
    action === "deleted"
      ? `The person deleted the memory file ${file} themselves, in the memory panel. Do not write it or what it said again, unless the person asks for that.`
      : `The person changed the memory file ${file} themselves, in the memory panel. What it says now is what they want: do not write back what they took out, unless the person asks for that.`;
  const added = await messages.append(tx, open.id, null, [
    segmentMessages.eventEntry({ type: "memory", scope, path, action, text }),
  ]);
  if (added === null) throw new TurnRunning();
}

async function stateAnswer(
  db: TripsDb,
  userId: string,
  result: SegmentResult,
): Promise<Response> {
  if (result.status === "busy") return busy();
  if (result.status === "not_found" || !result.segment.tripId) {
    return notFound();
  }
  const state = await readState(db, userId, result.segment.tripId);
  return state ? json(state) : notFound();
}

function ndjson(lines: AsyncIterable<StreamLine>): Response {
  const iterator = lines[Symbol.asyncIterator]();
  const encoder = new TextEncoder();
  // A reader that goes away only stops the reading: the turn goes on.
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const next = await iterator.next();
      if (next.done) {
        controller.close();
      } else {
        controller.enqueue(encoder.encode(`${JSON.stringify(next.value)}\n`));
      }
    },
  });
  return new Response(body, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}

/**
 * The HTTP routes of the trip assistant, for a signed-in member who can
 * change the trip. A conversation, change or memory of another person
 * answers 404, as one that does not exist.
 */
export function makeAssistantRoutes(deps: AssistantRouteDeps) {
  function route<T>(
    schema: z.ZodType<T>,
    run: (db: TripsDb, userId: string, body: T) => Promise<Response>,
  ) {
    return async (request: Request): Promise<Response> => {
      try {
        const db = deps.getDb();
        const userId = await requireUserId(request, db);
        if (typeof userId !== "string") return userId;
        const body = schema.safeParse(await request.json().catch(() => null));
        if (!body.success) return json({ error: "invalid_body" }, 400);
        return await run(db, userId, body.data);
      } catch (error) {
        console.error("An assistant route failed:", describeError(error));
        return serverError();
      }
    };
  }

  const send = async (request: Request): Promise<Response> => {
    try {
      const db = deps.getDb();
      const userId = await requireUserId(request, db);
      if (typeof userId !== "string") return userId;
      const body = await readSendBody(request);
      if (!body.ok) {
        return json(
          { error: body.error },
          body.error === "attachment_too_large" ? 413 : 400,
        );
      }
      if (body.text.trim() === "" && body.files.length === 0) {
        return json({ error: "invalid_body" }, 400);
      }
      return await sendMessage(db, userId, body);
    } catch (error) {
      console.error("An assistant route failed:", describeError(error));
      return serverError();
    }
  };

  async function sendMessage(
    db: TripsDb,
    userId: string,
    {
      tripId,
      text,
      files,
      locale,
    }: {
      tripId: string | null;
      text: string;
      files: ReaderFile[];
      locale?: SupportedLocale;
    },
  ): Promise<Response> {
    const started = performance.now();
    const result =
      tripId === null
        ? await segments.forNewTrip(db, userId, deps.now())
        : await segments.forMessage(
            db,
            userId,
            tripId,
            deps.now(),
            deps.summaryModel(),
          );
    if (result.status === "not_found") return notFound();
    if (result.status === "busy") return busy();
    const asker = (
      await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, userId))
    ).at(0);
    const turn = await runTurn({
      db,
      userId,
      askerName: asker?.email ?? "a member",
      conversationId: result.segment.id,
      text,
      attachments: files,
      model: deps.turnModel(),
      researcher: deps.researcher?.(),
      reader: deps.reader?.(),
      skills: deps.skills,
      locale,
      deadlineMs: SEND_BUDGET_MS - (performance.now() - started),
    });
    switch (turn.status) {
      case "not_found":
        return notFound();
      case "busy":
        return busy();
      case "too_long":
        return json({ error: "too_long" }, 400);
      case "too_many_attachments":
      case "attachment_type":
        return json({ error: turn.status }, 400);
      case "attachment_too_large":
        return json({ error: turn.status }, 413);
      case "failed":
        return serverError();
    }
    deps.afterResponse(() => turn.finished);
    const conversationId = result.segment.id;
    return ndjson(
      (async function* (): AsyncGenerator<StreamLine> {
        yield { type: "started", conversationId, turnId: turn.turnId };
        yield* turn.events;
      })(),
    );
  }

  const state = route(
    z.strictObject({ tripId: z.uuid().nullable() }),
    async (db, userId, { tripId }) => {
      const answer =
        tripId === null
          ? await readNewTripState(db, userId, deps.now())
          : await readState(db, userId, tripId);
      return answer ? json(answer) : notFound();
    },
  );

  const version = route(tripBody, async (db, userId, { tripId }) => {
    const trip = await asViewer(db, userId, async (tx) =>
      (await roleIn(tx, tripId)) === null ? null : tripView.read(tx, tripId),
    );
    return trip ? json({ version: tripView.version(trip) }) : notFound();
  });

  const startNew = route(tripBody, async (db, userId, { tripId }) =>
    stateAnswer(
      db,
      userId,
      await segments.startNew(db, userId, tripId, deps.summaryModel()),
    ),
  );

  const list = route(tripBody, async (db, userId, { tripId }) => {
    const found = await asViewer(db, userId, async (tx) =>
      (await canEditIn(tx, tripId)) ? conversations.list(tx, tripId) : null,
    );
    if (!found) return notFound();
    return json({
      segments: found
        .filter((each) => each.lastMessageAt !== null)
        .map(segmentInfo),
    });
  });

  const read = route(
    conversationBody,
    async (db, userId, { conversationId }) => {
      const found = await asViewer(
        db,
        userId,
        async (tx): Promise<SegmentTranscript | null> => {
          const segment = await conversations.get(tx, conversationId);
          if (
            !segment ||
            (segment.tripId !== null && !(await canEditIn(tx, segment.tripId)))
          ) {
            return null;
          }
          return {
            segment: segmentInfo(segment),
            ...(await transcriptOf(tx, segment.id)),
            running: segment.turnRunning,
          };
        },
      );
      return found ? json(found) : notFound();
    },
  );

  const reopen = route(
    conversationBody,
    async (db, userId, { conversationId }) =>
      stateAnswer(
        db,
        userId,
        await segments.reopen(db, userId, conversationId, deps.summaryModel()),
      ),
  );

  const decide = route(
    z.strictObject({
      changeId: z.uuid(),
      decision: z.enum(["accept", "skip", "undo"]),
    }),
    async (db, userId, { changeId, decision }) => {
      const mine = await asViewer(db, userId, async (tx) => {
        const change = await changes.get(tx, changeId);
        return change?.tripId ? canEditIn(tx, change.tripId) : false;
      });
      if (!mine) return notFound();
      return json(await changeService[decision](db, userId, changeId));
    },
  );

  const cardAction = route(
    z.strictObject({
      changeId: z.uuid(),
      itemId: z.string().min(1).max(40),
      action: z.enum(CARD_ACTIONS),
      dayId: entityId,
    }),
    async (db, userId, input) => {
      const mine = await asViewer(db, userId, async (tx) => {
        const change = await changes.get(tx, input.changeId);
        return change?.tripId ? canEditIn(tx, change.tripId) : false;
      });
      if (!mine) return notFound();
      return json(await cardActions.act(db, userId, input));
    },
  );

  function scopeOf(name: "trip" | "personal", tripId: string): MemoryScope {
    return name === "trip" ? { tripId } : "personal";
  }

  const memoryList = route(tripBody, async (db, userId, { tripId }) => {
    const found = await asViewer(
      db,
      userId,
      async (tx): Promise<MemoryLists | null> => {
        if ((await roleIn(tx, tripId)) === null) return null;
        const [trip, personal] = await Promise.all([
          memories.list(tx, { tripId }),
          memories.list(tx, "personal"),
        ]);
        return {
          trip: trip.map(memoryFile),
          personal: personal.map(memoryFile),
        };
      },
    );
    return found ? json(found) : notFound();
  });

  const memoryWrite = route(
    z.strictObject({
      tripId: z.uuid(),
      scope: scopeName,
      path: memoryPath,
      content: z.string().max(MAX_MEMORY_FILE_CHARS),
    }),
    async (db, userId, { tripId, scope, path, content }) => {
      const result = await whileNoTurn(() =>
        asViewer(db, userId, async (tx) => {
          if (!(await canEditIn(tx, tripId))) return "forbidden";
          const memoryScope = scopeOf(scope, tripId);
          const before = await memories.read(tx, memoryScope, path);
          const written = await memories.write(tx, memoryScope, path, content);
          if (written === "written" && before && before.content !== content) {
            await tellAssistant(tx, tripId, scope, path, "changed");
          }
          return written;
        }),
      );
      if (result === "busy") return busy();
      if (result === "written") return json({ ok: true });
      if (result === "forbidden") return notFound();
      return json({ error: result }, 422);
    },
  );

  const memoryDelete = route(
    z.strictObject({ tripId: z.uuid(), scope: scopeName, path: memoryPath }),
    async (db, userId, { tripId, scope, path }) => {
      const deleted = await whileNoTurn(() =>
        asViewer(db, userId, async (tx) => {
          if (!(await canEditIn(tx, tripId))) return false;
          const memoryScope = scopeOf(scope, tripId);
          // The store deletes a whole directory by its prefix. The panel deletes one file, so the file must exist.
          if (!(await memories.read(tx, memoryScope, path))) return false;
          const removed = (await memories.remove(tx, memoryScope, path)) ?? 0;
          if (removed === 0) return false;
          await tellAssistant(tx, tripId, scope, path, "deleted");
          return true;
        }),
      );
      if (deleted === "busy") return busy();
      return deleted ? json({ ok: true }) : notFound();
    },
  );

  return {
    send,
    state,
    version,
    startNew,
    list,
    read,
    reopen,
    decide,
    cardAction,
    memoryList,
    memoryWrite,
    memoryDelete,
  };
}
