import { PGlite } from "@electric-sql/pglite";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, expect, it } from "vitest";
import { users } from "#src/db/auth-schema.ts";
import {
  assistantChanges,
  assistantConversations,
  assistantMemories,
  assistantMessages,
  schema,
  tripMembers,
} from "#src/db/schema.ts";
import { TRIPS_MIGRATIONS_FOLDER } from "#src/db/trips-migrations-folder.ts";
import type { TripsDb } from "#src/db/types.ts";
import { asViewer, type Transaction } from "#src/trips/as-viewer.ts";
import { writeTrips } from "#src/trips/write-trips.ts";
import { changes } from "./changes.ts";
import { conversations } from "./conversations.ts";
import { memories } from "./memories.ts";
import { messages } from "./messages.ts";

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

async function addUser() {
  const [{ id }] = await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      email: `${crypto.randomUUID()}@example.com`,
    })
    .returning({ id: users.id });
  return id;
}

const NEW_TRIP = {
  title: "Three days in Rome",
  firstDate: "2027-03-01",
  days: 3,
  timeZone: "Europe/Rome",
  language: "en",
} as const;

function as<T>(userId: string, run: (tx: Transaction) => Promise<T>) {
  return asViewer(db, userId, run);
}

async function tripWithEditor() {
  const owner = await addUser();
  const editor = await addUser();
  const tripId = await writeTrips.create(db, owner, NEW_TRIP);
  await db
    .insert(tripMembers)
    .values({ tripId, userId: editor, role: "editor" });
  return { owner, editor, tripId };
}

/** A segment of the user in the trip, with a message, a card and a personal memory. */
async function talk(userId: string, tripId: string | null) {
  return as(userId, async (tx) => {
    const conversation =
      tripId === null
        ? await conversations.start(tx, null)
        : await conversations.current(tx, tripId);
    if (!conversation) throw new Error("No conversation.");
    await messages.append(tx, conversation.id, null, [
      {
        kind: "model",
        message: { role: "user", content: "No early flights." },
      },
    ]);
    const changeId = await changes.record(
      tx,
      conversation.id,
      tripId === null
        ? { kind: "research", card: { title: "A card" } }
        : { kind: "proposal", ops: [], card: { title: "A card" } },
    );
    if (!changeId) throw new Error("No change.");
    expect(
      await memories.write(
        tx,
        "personal",
        "preferences.md",
        "No early flights.",
      ),
    ).toBe("written");
    return { conversationId: conversation.id, changeId };
  });
}

function rowsOf(userId: string) {
  return Promise.all([
    db.$count(
      assistantConversations,
      eq(assistantConversations.userId, userId),
    ),
    db.$count(assistantChanges, eq(assistantChanges.askerId, userId)),
    db.$count(assistantMemories, eq(assistantMemories.userId, userId)),
  ]);
}

function messageCount(conversationId: string) {
  return db.$count(
    assistantMessages,
    eq(assistantMessages.conversationId, conversationId),
  );
}

it("shows a conversation, its messages, its changes and a personal memory only to their user", async () => {
  const { owner, editor, tripId } = await tripWithEditor();
  const { conversationId, changeId } = await talk(owner, tripId);

  for (const viewer of [editor, await addUser()]) {
    await as(viewer, async (tx) => {
      expect(await conversations.get(tx, conversationId)).toBeNull();
      expect(await conversations.list(tx, tripId)).toEqual([]);
      expect(await messages.read(tx, conversationId)).toEqual([]);
      expect(await changes.list(tx, conversationId)).toEqual([]);
      expect(await changes.get(tx, changeId)).toBeNull();
      expect(await memories.list(tx, "personal")).toEqual([]);
      for (const table of [
        assistantConversations,
        assistantMessages,
        assistantChanges,
        assistantMemories,
      ]) {
        expect(await tx.$count(table)).toBe(0);
      }
      expect(await changes.decide(tx, changeId, "accept")).toBeNull();
      expect(
        await messages.append(tx, conversationId, null, [
          { kind: "model", message: { role: "user", content: "Hi" } },
        ]),
      ).toBeNull();
    });
  }

  for (const statement of [
    sql`insert into assistant_conversations (user_id) values (${owner})`,
    sql`update assistant_conversations set summary = 'x'`,
    sql`delete from assistant_messages`,
    sql`update assistant_changes set status = 'accepted'`,
    sql`insert into assistant_memories (user_id, path, content) values (${owner}, 'a.md', 'x')`,
  ]) {
    await expect(as(owner, (tx) => tx.execute(statement))).rejects.toThrow();
  }

  await as(owner, async (tx) => {
    expect(await messages.read(tx, conversationId)).toHaveLength(1);
    expect(await changes.get(tx, changeId)).toMatchObject({
      status: "pending",
    });
    expect(await memories.read(tx, "personal", "preferences.md")).toMatchObject(
      { content: "No early flights." },
    );
  });
});

it("shows a trip's memory to its members only, and lets only them write it", async () => {
  const { owner, editor, tripId } = await tripWithEditor();
  const stranger = await addUser();
  const scope = { tripId };

  expect(
    await as(owner, (tx) => memories.write(tx, scope, "plan.md", "No car.")),
  ).toBe("written");
  expect(
    await as(stranger, (tx) =>
      memories.write(tx, scope, "plan.md", "Rent a car."),
    ),
  ).toBe("forbidden");

  expect(await as(stranger, (tx) => memories.list(tx, scope))).toEqual([]);
  expect(
    await as(editor, (tx) => memories.read(tx, scope, "plan.md")),
  ).toMatchObject({ content: "No car." });
});

it("deletes a trip's conversations, messages, changes and memory with the trip", async () => {
  const { owner, editor, tripId } = await tripWithEditor();
  const talks = [await talk(owner, tripId), await talk(editor, tripId)];
  await as(owner, (tx) => memories.write(tx, { tripId }, "plan.md", "No car."));

  await as(owner, (tx) =>
    tx.execute(sql`select public.trips_delete(${tripId})`),
  );

  for (const table of [
    assistantConversations,
    assistantChanges,
    assistantMemories,
  ]) {
    expect(await db.$count(table, eq(table.tripId, tripId))).toBe(0);
  }
  for (const { conversationId } of talks) {
    expect(await messageCount(conversationId)).toBe(0);
  }
  // A personal memory is not the trip's.
  expect(await rowsOf(owner)).toEqual([0, 0, 1]);
});

it("deletes the conversations and changes of a member who is removed from a trip, and only theirs", async () => {
  const { owner, editor, tripId } = await tripWithEditor();
  await talk(owner, tripId);
  const { conversationId } = await talk(editor, tripId);
  await as(editor, (tx) =>
    memories.write(tx, { tripId }, "plan.md", "No car."),
  );

  const [{ removed }] = await as(owner, (tx) =>
    tx
      .select({ removed: sql<boolean>`removed` })
      .from(sql`public.trips_remove_member(${tripId}, ${editor}) as removed`),
  );
  expect(removed).toBe(true);

  expect(await rowsOf(editor)).toEqual([0, 0, 1]);
  expect(await messageCount(conversationId)).toBe(0);
  expect(await rowsOf(owner)).toEqual([1, 1, 1]);
  expect(
    await db.$count(assistantMemories, eq(assistantMemories.tripId, tripId)),
  ).toBe(1);
});

it("deletes every conversation and the personal memory of a deleted account, and keeps the trip memory that it wrote", async () => {
  const { owner, editor, tripId } = await tripWithEditor();
  await talk(editor, tripId);
  const { conversationId } = await talk(editor, null);
  await as(editor, (tx) =>
    memories.write(tx, { tripId }, "plan.md", "No car."),
  );

  await db.execute(sql`select public.trips_forget_user(${editor}::uuid)`);
  await db.delete(users).where(eq(users.id, editor));

  expect(await rowsOf(editor)).toEqual([0, 0, 0]);
  expect(await messageCount(conversationId)).toBe(0);
  expect(
    await as(owner, (tx) => memories.read(tx, { tripId }, "plan.md")),
  ).toMatchObject({ content: "No car." });
});

it("reads a message back exactly as it was written", async () => {
  const owner = await addUser();
  const message = {
    role: "assistant",
    content: [
      {
        type: "tool-call",
        input: { zebra: 1, b: "nul \u0000 here", aa: "lone \ud800 half" },
      },
    ],
  };
  const read = await as(owner, async (tx) => {
    const conversation = await conversations.start(tx, null);
    if (!conversation) throw new Error("No conversation.");
    await messages.append(tx, conversation.id, null, [
      { kind: "model", message },
    ]);
    return messages.read(tx, conversation.id);
  });
  expect(JSON.stringify(read[0].message)).toBe(JSON.stringify(message));
});

it("adds nothing for a turn whose time ended after another turn took the segment", async () => {
  const { owner, tripId } = await tripWithEditor();
  const hi = [
    { kind: "model" as const, message: { role: "user", content: "Hi" } },
  ];
  const { conversationId, first } = await as(owner, async (tx) => {
    const conversation = await conversations.current(tx, tripId);
    if (!conversation) throw new Error("No conversation.");
    const turn = await conversations.takeTurn(tx, conversation.id, 60);
    if (!turn) throw new Error("No turn.");
    return { conversationId: conversation.id, first: turn };
  });
  await db
    .update(assistantConversations)
    .set({ turnExpiresAt: new Date(Date.now() - 1000) })
    .where(eq(assistantConversations.id, conversationId));

  await as(owner, async (tx) => {
    const second = await conversations.takeTurn(tx, conversationId, 60);
    if (!second) throw new Error("No second turn.");
    expect(await messages.append(tx, conversationId, second, hi)).toBe(1);
    expect(await conversations.releaseTurn(tx, conversationId, second)).toBe(
      true,
    );
    expect(await messages.append(tx, conversationId, first, hi)).toBeNull();
  });
});

it("accepts a proposal once when it is accepted twice", async () => {
  const { owner, tripId } = await tripWithEditor();
  const { changeId } = await talk(owner, tripId);
  let applied = 0;

  const accept = () =>
    as(owner, async (tx) => {
      const decided = await changes.decide(tx, changeId, "accept");
      if (decided) applied += 1;
      return decided;
    });
  const results = await Promise.all([accept(), accept()]);
  expect(results.filter(Boolean)).toHaveLength(1);
  expect(await accept()).toBeNull();
  expect(applied).toBe(1);

  const failed = new Error("The save failed.");
  const { changeId: other } = await talk(owner, tripId);
  await expect(
    as(owner, async (tx) => {
      await changes.decide(tx, other, "accept");
      throw failed;
    }),
  ).rejects.toBe(failed);
  expect(await as(owner, (tx) => changes.get(tx, other))).toMatchObject({
    status: "pending",
  });
});
