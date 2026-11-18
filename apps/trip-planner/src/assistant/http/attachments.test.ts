import { PGlite } from "@electric-sql/pglite";
import { convertArrayToReadableStream, MockLanguageModelV4 } from "ai/test";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { emptyUse } from "#src/ai/empty-use.ts";
import type {
  Reader,
  ReaderFile,
} from "#src/assistant/agent/reader/reader-agent.ts";
import { segmentMessages } from "#src/assistant/agent/segment-messages.ts";
import { tripView } from "#src/assistant/agent/trip-view.ts";
import {
  MAX_PDF_BYTES,
  PASTED_TEXT_NAMES,
  type ReadItem,
} from "#src/assistant/check-attachments.ts";
import { changes } from "#src/assistant/store/changes.ts";
import { conversations } from "#src/assistant/store/conversations.ts";
import { memories } from "#src/assistant/store/memories.ts";
import { messages } from "#src/assistant/store/messages.ts";
import type { StreamLine } from "#src/assistant/types.ts";
import { tripsAuthStore } from "#src/auth/trips-auth-store.ts";
import { tripsSessionCookie } from "#src/auth/trips-session-cookie.ts";
import { users } from "#src/db/auth-schema.ts";
import { schema } from "#src/db/schema.ts";
import { TRIPS_MIGRATIONS_FOLDER } from "#src/db/trips-migrations-folder.ts";
import type { TripsDb } from "#src/db/types.ts";
import { asViewer } from "#src/trips/as-viewer.ts";
import sampleTrip from "#src/trips/sample-trip.json";
import { makeAssistantRoutes } from "./make-assistant-routes.ts";
import { segmentSummary } from "./segment-summary.ts";

type StreamPart =
  Awaited<
    ReturnType<MockLanguageModelV4["doStream"]>
  >["stream"] extends ReadableStream<infer Part>
    ? Part
    : never;

const ORIGIN = "http://localhost:3000";
const SECRET = "SENTINEL-raw-content-7f3a";
const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 5, text: 5, reasoning: 0 },
};

const STAY: ReadItem = {
  kind: "stay",
  title: "Hotel Exemplo, 2 nights",
  date: "2026-05-04",
  time: "15:00",
  endDate: "2026-05-06",
  endTime: "11:00",
  place: "Rua Exemplo 1, Porto",
  reference: "HX-1234",
  note: null,
  quote: "Check-in from 15:00",
  file: "",
};

let client: PGlite;
let db: TripsDb;
let userId: string;
let token: string;
let tripId: string;
const pending: Promise<unknown>[] = [];
const prompts: Parameters<MockLanguageModelV4["doStream"]>[0]["prompt"][] = [];
const readFiles: ReaderFile[][] = [];

/** Reads one made-up stay from the first file, and keeps what it got. */
const reader: Reader = (files) => {
  readFiles.push([...files]);
  return Promise.resolve({
    status: "ok",
    items: [{ ...STAY, file: files[0].name }],
    use: emptyUse(),
  });
};

/** A model that tries to change the trip at once and to write a memory, then answers. */
function greedyModel() {
  let step = 0;
  return new MockLanguageModelV4({
    doStream: async ({ prompt }) => {
      step += 1;
      prompts.push(prompt);
      const trip = await asViewer(db, userId, (tx) =>
        tripView.read(tx, tripId),
      );
      const parts: StreamPart[] =
        step === 1
          ? [
              {
                type: "tool-call",
                toolCallId: `call_${crypto.randomUUID()}`,
                toolName: "apply_changes",
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
                type: "tool-call",
                toolCallId: `call_${crypto.randomUUID()}`,
                toolName: "memory",
                input: JSON.stringify({
                  command: "create",
                  path: "/memories/me/hotels.md",
                  file_text: "Likes Hotel Exemplo.",
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
              { type: "text-delta", id: "t", delta: "Done." },
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

const routes = makeAssistantRoutes({
  getDb: () => db,
  summaryModel: () => null,
  turnModel: greedyModel,
  reader: () => reader,
  skills: () => Promise.resolve([]),
  afterResponse: (task) => {
    pending.push(task());
  },
  now: () => new Date(),
});

async function post(body: BodyInit, json = false) {
  const response = await routes.send(
    new Request(`${ORIGIN}/api/assistant/send`, {
      method: "POST",
      headers: {
        Origin: ORIGIN,
        Cookie: `${tripsSessionCookie.name}=${token}`,
        ...(json && { "Content-Type": "application/json" }),
      },
      body,
    }),
  );
  const lines =
    response.status === 200
      ? (await response.text())
          .trim()
          .split("\n")
          .map((line) => JSON.parse(line) as StreamLine)
      : [];
  await Promise.all(pending);
  return { status: response.status, response, lines };
}

function form(text: string, files: readonly File[]) {
  const body = new FormData();
  body.set("tripId", tripId);
  body.set("text", text);
  for (const file of files) body.append("file", file);
  return body;
}

function png(size: number, name = "flight.png") {
  const bytes = new Uint8Array(size);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  bytes.set(new TextEncoder().encode(SECRET), 16);
  return new File([bytes], name, { type: "image/png" });
}

function pdf(size: number) {
  const bytes = new Uint8Array(size);
  bytes.set(new TextEncoder().encode(`%PDF-1.4 ${SECRET}`));
  return new File([bytes], "train.pdf", { type: "application/pdf" });
}

async function dinnerTime() {
  const trip = await asViewer(db, userId, (tx) => tripView.read(tx, tripId));
  return trip?.days[0].moments.find((moment) => moment.id === "m0dinner")?.time;
}

async function storedRows() {
  return asViewer(db, userId, async (tx) => {
    const open = await conversations.current(tx, tripId);
    if (!open) throw new Error("No conversation.");
    return messages.read(tx, open.id);
  });
}

beforeAll(async () => {
  // The memory tool is made from the provider, which asks for a key. The stub model calls no API.
  vi.stubEnv("ANTHROPIC_API_KEY", "test-key-never-sent");
  client = await PGlite.create();
  db = drizzle({ client, schema });
  await migrate(drizzle({ client }), {
    migrationsFolder: TRIPS_MIGRATIONS_FOLDER,
  });
});

afterAll(() => client.close());

beforeEach(async () => {
  prompts.length = 0;
  readFiles.length = 0;
  userId = crypto.randomUUID();
  await db
    .insert(users)
    .values({ id: userId, email: `${crypto.randomUUID()}@example.com` });
  token = await db.transaction((tx) =>
    tripsAuthStore.createSession(tx, {
      userId,
      userAgent: "test",
      now: new Date(),
      maxAgeSeconds: tripsSessionCookie.maxAgeSeconds,
    }),
  );
  tripId = await asViewer(db, userId, async (tx) => {
    const [{ id }] = await tx
      .select({ id: sql<string>`id` })
      .from(
        sql`public.trips_create(${JSON.stringify(sampleTrip)}::jsonb) as id`,
      );
    return id;
  });
});

it("refuses a direct change and a memory write in a turn with attachment items, and stores names and items but no file", async () => {
  const before = await dinnerTime();
  const pasted = new File([`Booking for two. ${SECRET}`], "Pasted text", {
    type: "text/plain",
  });

  const { status, lines } = await post(
    form("Add these to the trip", [png(2048), pasted]),
  );

  expect(status).toBe(200);
  expect(lines).toContainEqual({
    type: "attachments",
    status: "read",
    items: 1,
  });
  expect(lines.at(-1)).toEqual({ type: "done", status: "ok" });
  expect(await dinnerTime()).toBe(before);
  expect(
    await asViewer(db, userId, (tx) => memories.list(tx, "personal")),
  ).toEqual([]);
  const rows = await storedRows();
  expect(
    await asViewer(db, userId, async (tx) => {
      const open = await conversations.current(tx, tripId);
      return open ? changes.list(tx, open.id) : null;
    }),
  ).toEqual([]);

  expect(rows[0].attachments).toEqual({
    status: "read",
    files: [
      { name: "flight.png", kind: "image", size: 2048 },
      { name: "Pasted text", kind: "text", size: pasted.size },
    ],
    items: [{ ...STAY, file: "flight.png" }],
  });
  expect(JSON.stringify(rows)).not.toContain(SECRET);
  expect(JSON.stringify(rows[0].message)).toContain("Hotel Exemplo");
  expect(JSON.stringify(prompts)).not.toContain(SECRET);
  const refusals = JSON.stringify(rows.slice(1));
  expect(refusals).toMatch(/propose_changes/);
  expect(refusals).toMatch(/Memory cannot change/);
});

it("refuses a direct change and a memory write in a turn whose message has a web link", async () => {
  const { status, lines } = await post(
    JSON.stringify({
      tripId,
      text: "Dinner at nine, like on https://cafe.example.com/menu",
    }),
    true,
  );

  expect(status).toBe(200);
  expect(lines.at(-1)).toEqual({ type: "done", status: "ok" });
  expect(await dinnerTime()).not.toBe("21:00");
  const refusals = JSON.stringify((await storedRows()).slice(1));
  expect(refusals).toMatch(/propose_changes/);
  expect(refusals).toMatch(/Memory cannot change/);
});

it("sends a long text that came as plain text through the reader, never to the assistant", async () => {
  const long = `${"Hotel Exemplo, Rua Exemplo 1, Porto. ".repeat(80)}${SECRET}`;

  const { status } = await post(
    JSON.stringify({ tripId, text: long, locale: "zh" }),
    true,
  );

  expect(status).toBe(200);
  expect(readFiles).toHaveLength(1);
  expect(readFiles[0][0]).toMatchObject({
    name: PASTED_TEXT_NAMES.zh,
    kind: "text",
  });
  expect(new TextDecoder().decode(readFiles[0][0].data)).toContain(SECRET);
  expect(JSON.stringify(prompts)).not.toContain(SECRET);
  expect(JSON.stringify(await storedRows())).not.toContain(SECRET);
  expect(await dinnerTime()).not.toBe("21:00");

  const said = segmentSummary.said(
    await asViewer(db, userId, async (tx) => {
      const open = await conversations.current(tx, tripId);
      if (!open) throw new Error("No conversation.");
      return segmentMessages.read(tx, open.id);
    }),
  );
  expect(said).toContain("Member: (attached 1 files, not shown)");
  expect(said).not.toContain("Hotel Exemplo");
});

it("refuses more than 4 attachments, a PDF over 3 MB and more than 4 MB in all, and reads none of them", async () => {
  const five = await post(
    form(
      "",
      [1, 2, 3, 4, 5].map((n) => png(64, `${String(n)}.png`)),
    ),
  );
  expect(five.status).toBe(400);
  expect(await five.response.json()).toEqual({
    error: "too_many_attachments",
  });

  const bigPdf = await post(form("", [pdf(MAX_PDF_BYTES + 1)]));
  expect(bigPdf.status).toBe(413);

  const tooMuch = await post(
    form("", [
      png(1_500_000, "a.png"),
      png(1_500_000, "b.png"),
      png(1_500_000, "c.png"),
    ]),
  );
  expect(tooMuch.status).toBe(413);

  const unknown = await post(
    form("", [new File(["MZ binary"], "tool.exe", { type: "image/png" })]),
  );
  expect(unknown.status).toBe(400);
  expect(readFiles).toEqual([]);
});
