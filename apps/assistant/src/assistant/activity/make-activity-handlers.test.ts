import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFakeCalendarServer } from "#src/assistant/calendar/testing/create-fake-calendar-server.ts";
import { agentActions, agentRuns } from "#src/assistant/db/schema.ts";
import {
  createTestDb,
  type TestDb,
} from "#src/assistant/db/testing/create-test-db.ts";
import { createFakeMailServer } from "#src/assistant/mail/testing/create-fake-mail-server.ts";
import {
  insertAccount,
  insertUser,
  mailDeps,
} from "#src/assistant/mail/testing/insert-account.ts";
import { makeActivityHandlers } from "./make-activity-handlers.ts";

const ORIGIN = "http://localhost:3000";

let db: TestDb;
let owner: string;
let stranger: string;
let runId: string;
let actionId: string;

beforeEach(async () => {
  db = await createTestDb();
  owner = await insertUser(db);
  stranger = await insertUser(db);
  const accountId = await insertAccount(db, owner);
  const [run] = await db
    .insert(agentRuns)
    .values({
      userId: owner,
      task: "organise",
      modelId: "test",
      startedAt: new Date(),
    })
    .returning({ id: agentRuns.id });
  runId = run.id;
  const [action] = await db
    .insert(agentActions)
    .values({
      runId,
      userId: owner,
      accountId,
      kind: "create_folder",
      toFolder: "Travel",
      reason: "Trips",
    })
    .returning({ id: agentActions.id });
  actionId = action.id;
});

afterEach(async () => {
  await db.close();
});

function post(
  body: unknown,
  {
    session = owner,
    origin = ORIGIN,
  }: { session?: string | null; origin?: string } = {},
) {
  const mail = createFakeMailServer({
    user: "me@icloud.com",
    password: "app-password",
  });
  const calendar = createFakeCalendarServer({
    user: "me@icloud.com",
    password: "app-password",
  });
  const handlers = makeActivityHandlers({
    isConfigured: () => true,
    getDb: () => db,
    getSession: () =>
      Promise.resolve(
        session === null ? null : { sessionId: randomUUID(), userId: session },
      ),
    getUndoDeps: () => ({
      ...mailDeps({ connector: mail.connector }),
      calendarConnector: calendar.connector,
    }),
    now: () => new Date(),
  });
  return handlers.undo(
    new Request(`${ORIGIN}/api/activity/undo`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

async function undoneAt() {
  const [action] = await db
    .select({ undoneAt: agentActions.undoneAt })
    .from(agentActions)
    .where(eq(agentActions.id, actionId));
  return action.undoneAt;
}

describe("the undo route", () => {
  it("undoes the session user's run", async () => {
    const response = await post({ runId });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      outcomes: [{ actionId, undone: true }],
    });
    expect(await undoneAt()).not.toBeNull();
  });

  it("refuses a request without a session or from another origin", async () => {
    expect((await post({ runId }, { session: null })).status).toBe(401);
    expect(
      (await post({ runId }, { origin: "https://evil.example" })).status,
    ).toBe(403);
    expect(await undoneAt()).toBeNull();
  });

  it("takes the user from the session only, so another user's actions are not found", async () => {
    expect((await post({ runId }, { session: stranger })).status).toBe(404);
    expect(
      (await post({ actionIds: [actionId] }, { session: stranger })).status,
    ).toBe(404);
    expect(
      (await post({ runId, userId: owner }, { session: stranger })).status,
    ).toBe(400);
    expect(await undoneAt()).toBeNull();
  });
});
