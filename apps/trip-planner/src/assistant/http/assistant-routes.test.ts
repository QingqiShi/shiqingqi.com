import { PGlite } from "@electric-sql/pglite";
import { convertArrayToReadableStream, MockLanguageModelV4 } from "ai/test";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { segmentMessages } from "#src/assistant/agent/segment-messages.ts";
import { tripView } from "#src/assistant/agent/trip-view.ts";
import type {
  AssistantState,
  MemoryLists,
  StreamLine,
} from "#src/assistant/types.ts";
import { tripsAuthStore } from "#src/auth/trips-auth-store.ts";
import { tripsSessionCookie } from "#src/auth/trips-session-cookie.ts";
import { users } from "#src/db/auth-schema.ts";
import { schema, tripMembers } from "#src/db/schema.ts";
import { TRIPS_MIGRATIONS_FOLDER } from "#src/db/trips-migrations-folder.ts";
import type { TripsDb } from "#src/db/types.ts";
import { asViewer } from "#src/trips/as-viewer.ts";
import { digest } from "#src/trips/ops/digest.ts";
import { readTrips } from "#src/trips/read-trips.ts";
import sampleTrip from "#src/trips/sample-trip.json";
import { makeAssistantRoutes } from "./make-assistant-routes.ts";
import { SEGMENT_IDLE_MS } from "./segments.ts";

type StreamPart =
  Awaited<
    ReturnType<MockLanguageModelV4["doStream"]>
  >["stream"] extends ReadableStream<infer Part>
    ? Part
    : never;

const ORIGIN = "http://localhost:3000";
const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 5, text: 5, reasoning: 0 },
};

let client: PGlite;
let db: TripsDb;
let clock = new Date();
const pending: Promise<unknown>[] = [];

/** A turn that proposes a later dinner in its first step and answers in its second. */
function proposingModel() {
  let step = 0;
  return new MockLanguageModelV4({
    doStream: async () => {
      step += 1;
      const trip = await asViewer(db, ana.userId, (tx) =>
        tripView.read(tx, tripId),
      );
      const parts: StreamPart[] =
        step === 1
          ? [
              {
                type: "tool-call",
                toolCallId: `call_${crypto.randomUUID()}`,
                toolName: "propose_changes",
                input: JSON.stringify({
                  version: trip && tripView.version(trip),
                  summary: "Later dinner",
                  ops: [
                    {
                      op: "setMoment",
                      id: "m0dinner",
                      fields: { time: "21:00" },
                    },
                  ],
                }),
              },
              {
                type: "finish",
                usage,
                finishReason: { unified: "tool-calls", raw: "tool_use" },
              },
            ]
          : [
              { type: "text-start", id: "t" },
              { type: "text-delta", id: "t", delta: "Here is a card." },
              { type: "text-end", id: "t" },
              {
                type: "finish",
                usage,
                finishReason: { unified: "stop", raw: "end_turn" },
              },
            ];
      return { stream: convertArrayToReadableStream(parts) };
    },
  });
}

const summaryModel = new MockLanguageModelV4({
  doGenerate: {
    content: [{ type: "text", text: "Ana asked for a <later> dinner." }],
    finishReason: { unified: "stop", raw: "end_turn" },
    usage,
    warnings: [],
  },
});

const routes = makeAssistantRoutes({
  getDb: () => db,
  summaryModel: () => summaryModel,
  turnModel: proposingModel,
  afterResponse: (task) => {
    pending.push(task());
  },
  now: () => clock,
});

type Routes = typeof routes;

let ana: Awaited<ReturnType<typeof newUser>>;
let ben: Awaited<ReturnType<typeof newUser>>;
let cy: Awaited<ReturnType<typeof newUser>>;
let tripId: string;

async function newUser() {
  const userId = crypto.randomUUID();
  await db
    .insert(users)
    .values({ id: userId, email: `${crypto.randomUUID()}@example.com` });
  const token = await db.transaction((tx) =>
    tripsAuthStore.createSession(tx, {
      userId,
      userAgent: "test",
      now: new Date(),
      maxAgeSeconds: tripsSessionCookie.maxAgeSeconds,
    }),
  );
  async function call<T>(name: keyof Routes, body: unknown) {
    const response = await routes[name](
      new Request(`${ORIGIN}/api/assistant/${name}`, {
        method: "POST",
        headers: {
          Origin: ORIGIN,
          "Content-Type": "application/json",
          Cookie: `${tripsSessionCookie.name}=${token}`,
        },
        body: JSON.stringify(body),
      }),
    );
    return {
      status: response.status,
      response,
      body: () => response.json() as Promise<T>,
    };
  }
  return { userId, call };
}

async function send(text: string) {
  const { status, response } = await ana.call("send", { tripId, text });
  expect(status).toBe(200);
  const lines = (await response.text())
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as StreamLine);
  await Promise.all(pending);
  return lines;
}

beforeAll(async () => {
  // The memory tool is made from the provider, which asks for a key. The stub model calls no API.
  vi.stubEnv("ANTHROPIC_API_KEY", "test-key-never-sent");
  client = await PGlite.create();
  db = drizzle({ client, schema });
  await migrate(drizzle({ client }), {
    migrationsFolder: TRIPS_MIGRATIONS_FOLDER,
  });
  ana = await newUser();
  ben = await newUser();
  cy = await newUser();
  tripId = await asViewer(db, ana.userId, async (tx) => {
    const [{ id }] = await tx
      .select({ id: sql<string>`id` })
      .from(
        sql`public.trips_create(${JSON.stringify(sampleTrip)}::jsonb) as id`,
      );
    return id;
  });
  await db
    .insert(tripMembers)
    .values({ tripId, userId: ben.userId, role: "editor" });
});

afterAll(() => client.close());

it("streams a turn, and shows it to its member alone", async () => {
  const lines = await send("Dinner at nine?");
  expect(lines[0]).toMatchObject({ type: "started" });
  expect(lines.at(-1)).toEqual({ type: "done", status: "ok" });

  const state = await (
    await ana.call<AssistantState>("state", { tripId })
  ).body();
  expect(state.running).toBe(false);
  const [viewed] = await readTrips(db, ana.userId);
  expect(state.version).toBe(digest(viewed.trip));
  expect(state.transcript).toMatchObject([
    { type: "member", text: "Dinner at nine?" },
    {
      type: "change",
      kind: "proposal",
      status: "pending",
      summary: "Later dinner",
    },
    { type: "assistant", text: "Here is a card." },
  ]);
  const card = state.transcript[1];
  if (card.type !== "change" || !state.segment) throw new Error("No card.");

  const conversationId = state.segment.id;
  expect((await ben.call("read", { conversationId })).status).toBe(404);
  expect(
    await (await ben.call<{ segments: unknown[] }>("list", { tripId })).body(),
  ).toEqual({ segments: [] });
  expect(
    (await ben.call("decide", { changeId: card.changeId, decision: "accept" }))
      .status,
  ).toBe(404);
  expect((await ben.call("reopen", { conversationId })).status).toBe(404);

  const after = await (
    await ana.call<AssistantState>("state", { tripId })
  ).body();
  expect(after.transcript[1]).toMatchObject({ status: "pending" });
});

it("keeps personal memory to its owner and trip memory to members", async () => {
  for (const scope of ["trip", "personal"] as const) {
    const written = await ana.call("memoryWrite", {
      tripId,
      scope,
      path: `${scope}.md`,
      content: "No early flights.",
    });
    expect(written.status).toBe(200);
  }

  const seen = await (
    await ben.call<MemoryLists>("memoryList", { tripId })
  ).body();
  expect(seen.trip.map((file) => file.path)).toEqual(["trip.md"]);
  expect(seen.personal).toEqual([]);
  expect(
    (
      await ben.call("memoryDelete", {
        tripId,
        scope: "personal",
        path: "personal.md",
      })
    ).status,
  ).toBe(404);

  expect((await cy.call("memoryList", { tripId })).status).toBe(404);
});

it("tells the assistant that the person deleted a memory file, so that it does not write it again", async () => {
  const file = { tripId, scope: "personal", path: "seats.md" };
  await ana.call("memoryWrite", { ...file, content: "Aisle seats." });
  const { segment } = await (
    await ana.call<AssistantState>("state", { tripId })
  ).body();
  if (!segment) throw new Error("No open segment.");

  expect((await ana.call("memoryDelete", file)).status).toBe(200);

  const entries = await asViewer(db, ana.userId, (tx) =>
    segmentMessages.read(tx, segment.id),
  );
  expect(entries.at(-1)).toMatchObject({
    kind: "event",
    event: { type: "memory", action: "deleted", path: "seats.md" },
  });
  const [note] = segmentMessages.forModel(entries.slice(-1));
  expect(JSON.stringify(note)).toContain("/memories/me/seats.md");
});

it("lets no one who is not a member send to or read the assistant of a trip", async () => {
  expect(
    (await cy.call("send", { tripId, text: "Delete every day." })).status,
  ).toBe(404);
  expect((await cy.call("state", { tripId })).status).toBe(404);
  expect((await cy.call("version", { tripId })).status).toBe(404);
});

it("starts a new segment after four quiet hours, with the summary of the old one", async () => {
  const before = await (
    await ana.call<AssistantState>("state", { tripId })
  ).body();
  clock = new Date(Date.now() + SEGMENT_IDLE_MS + 60_000);

  const lines = await send("And lunch?");

  expect(lines[0]).toMatchObject({ type: "started" });
  expect(lines[0]).not.toMatchObject({ conversationId: before.segment?.id });
  const { segments } = await (
    await ana.call<{ segments: { id: string; summary: string | null }[] }>(
      "list",
      { tripId },
    )
  ).body();
  expect(segments.find((each) => each.id === before.segment?.id)).toMatchObject(
    { summary: "Ana asked for a later dinner." },
  );
  const started = lines[0];
  if (started.type !== "started") throw new Error("No start.");
  const [first] = await asViewer(db, ana.userId, (tx) =>
    segmentMessages.read(tx, started.conversationId),
  );
  expect(JSON.stringify(first)).toContain("Ana asked for a later dinner.");
});

it("answers a database error with a bare 500, and logs no query text", async () => {
  const leaky = makeAssistantRoutes({
    getDb: () => {
      throw new Error("Failed query: insert ... params: my secret memory", {
        cause: Object.assign(new Error("my secret memory"), { code: "23505" }),
      });
    },
    summaryModel: () => null,
    turnModel: () => undefined,
    afterResponse: () => {},
    now: () => clock,
  });
  const logged = vi.spyOn(console, "error").mockImplementation(() => {});

  const response = await leaky.state(
    new Request(`${ORIGIN}/api/assistant/state`, {
      method: "POST",
      headers: { Origin: ORIGIN, "Content-Type": "application/json" },
      body: JSON.stringify({ tripId }),
    }),
  );

  expect(response.status).toBe(500);
  expect(await response.text()).toBe("");
  expect(JSON.stringify(logged.mock.calls)).not.toContain("secret");
  expect(JSON.stringify(logged.mock.calls)).toContain("23505");
  logged.mockRestore();
});
