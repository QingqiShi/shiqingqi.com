import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, expect, it } from "vitest";
import { z } from "zod";
import { emptyUse } from "#src/ai/empty-use.ts";
import { conversations } from "#src/assistant/store/conversations.ts";
import { users } from "#src/db/auth-schema.ts";
import { schema } from "#src/db/schema.ts";
import { TRIPS_MIGRATIONS_FOLDER } from "#src/db/trips-migrations-folder.ts";
import type { TripsDb } from "#src/db/types.ts";
import { asViewer } from "#src/trips/as-viewer.ts";
import { readTrips } from "#src/trips/read-trips.ts";
import { callAgentTool } from "./agent-tool.ts";
import { runMemoryCommand } from "./memory-tool.ts";
import { researchTools } from "./research/research-tools.ts";
import { tripTools } from "./trip-tools.ts";
import { TurnTrust, type TurnContext } from "./turn-trust.ts";

let client: PGlite;
let db: TripsDb;

beforeAll(async () => {
  client = await PGlite.create();
  db = drizzle({ client, schema });
  await migrate(drizzle({ client }), {
    migrationsFolder: TRIPS_MIGRATIONS_FOLDER,
  });
});

afterAll(() => client.close());

let calls = 0;
const call = () => ({ toolCallId: `toolu_${String(++calls)}` });

/** A new user with a conversation that starts a trip, and the tools of a turn in it. */
async function turnWithNoTrip(
  memberText = "Three days in Porto from 10 May 2027, two of us.",
) {
  const userId = crypto.randomUUID();
  await db
    .insert(users)
    .values({ id: userId, email: `${crypto.randomUUID()}@example.com` });
  const conversation = await asViewer(db, userId, (tx) =>
    conversations.start(tx, null),
  );
  if (!conversation) throw new Error("No conversation.");
  const contextOf = (): TurnContext => ({
    db,
    userId,
    tripId: null,
    conversationId: conversation.id,
    trust: new TurnTrust(),
    emit: () => undefined,
    memberText,
    researcher: () =>
      Promise.resolve({ status: "ok", use: emptyUse(), items: [] }),
    attachmentNames: new Set(),
    signal: new AbortController().signal,
  });
  const context = contextOf();
  return {
    userId,
    conversationId: conversation.id,
    context,
    contextOf,
    tools: { ...tripTools(context), ...researchTools(context) },
    tripsOf: () => readTrips(db, userId),
  };
}

const PORTO = {
  title: "Porto",
  firstDate: "2027-05-10",
  days: 3,
  timeZone: "Europe/Lisbon",
  language: "en",
  party: "2 adults",
  batches: [
    {
      summary: "Day 1",
      ops: [{ op: "setDay", id: "$day1", fields: { title: "Ribeira" } }],
    },
  ],
} as const;

const refusal = z.strictObject({ error: z.string().regex(/no trip yet/) });

it("refuses the trip tools and the trip's memory in a conversation with no trip", async () => {
  const { context, tools, tripsOf } = await turnWithNoTrip();
  const change = {
    version: "v",
    summary: "Later dinner",
    ops: [{ op: "setMoment", id: "m0dinner", fields: { time: "21:00" } }],
  };

  for (const [tool, input] of [
    [tools.read_trip, {}],
    [tools.apply_changes, change],
    [tools.propose_changes, change],
    [tools.show_cards, { itemIds: ["x"] }],
  ] as const) {
    expect(
      refusal.safeParse(await callAgentTool(tool, input, call())).success,
    ).toBe(true);
  }
  expect(
    await runMemoryCommand(context, {
      command: "create",
      path: "/memories/trip/rules.md",
      file_text: "No rental car.",
    }),
  ).toMatch(/^Error: .*no trip yet/);
  expect(
    await runMemoryCommand(context, { command: "view", path: "/memories/me" }),
  ).toBe("/memories/me is empty.");
  expect(await tripsOf()).toEqual([]);
});

it("makes the trip for the asker, also in a tainted turn, and attaches the conversation once", async () => {
  const { userId, conversationId, context, contextOf, tools, tripsOf } =
    await turnWithNoTrip();
  context.trust.taint("attachment");

  const { tripId } = z
    .object({ tripId: z.uuid() })
    .parse(await tools.create_trip.execute(PORTO, call()));

  const [owned] = await tripsOf();
  expect(owned).toMatchObject({ id: tripId, role: "owner" });
  expect(owned.trip).toMatchObject({ title: "Porto", party: "2 adults" });
  expect(owned.trip.days.map((day) => day.title)).toEqual([
    "Ribeira",
    undefined,
    undefined,
  ]);
  expect(context.tripId).toBe(tripId);
  expect(
    await asViewer(db, userId, (tx) => conversations.get(tx, conversationId)),
  ).toMatchObject({ tripId, endedAt: null });

  await expect(tools.create_trip.execute(PORTO, call())).rejects.toThrow(
    /already has its trip/,
  );
  // Another turn that still takes the conversation to have no trip.
  await expect(
    tripTools(contextOf()).create_trip.execute(PORTO, call()),
  ).rejects.toThrow(/Nothing was made/);
  expect(await tripsOf()).toHaveLength(1);
});

it("does not let another person make a trip in my conversation", async () => {
  const mine = await turnWithNoTrip();
  const other = await turnWithNoTrip();

  await expect(
    tripTools({
      ...other.contextOf(),
      conversationId: mine.conversationId,
    }).create_trip.execute(PORTO, call()),
  ).rejects.toThrow(/Nothing was made/);
  expect(await other.tripsOf()).toEqual([]);
  expect(
    await asViewer(db, other.userId, (tx) =>
      conversations.get(tx, mine.conversationId),
    ),
  ).toBeNull();
});

it("does not put a plan with no year in the past without a second look", async () => {
  const { tools, tripsOf } = await turnWithNoTrip("Three days in Porto in May");
  const past = { ...PORTO, firstDate: "2020-05-10" };

  await expect(tools.create_trip.execute(past, call())).rejects.toThrow(
    /before today/,
  );
  expect(await tripsOf()).toEqual([]);
  await expect(
    tools.create_trip.execute({ ...PORTO, firstDate: "2099-05-10" }, call()),
  ).resolves.toMatchObject({ created: true });
});

it("makes no trip from a plan whose ops do not apply", async () => {
  const { tools, tripsOf } = await turnWithNoTrip();

  await expect(
    tools.create_trip.execute(
      {
        ...PORTO,
        batches: [
          {
            summary: "Day 9",
            ops: [{ op: "setDay", id: "$day9", fields: {} }],
          },
        ],
      },
      call(),
    ),
  ).rejects.toThrow(/\$day9/);
  expect(await tripsOf()).toEqual([]);
});
