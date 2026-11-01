import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { users } from "../db/schema.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import { makeUserCronHandler } from "./make-user-cron-handler.ts";

const SECRET = "test-cron-secret";

let db: TestDb;
const userIds = [randomUUID(), randomUUID()];

beforeAll(async () => {
  db = await createTestDb();
  for (const [index, id] of userIds.entries()) {
    await db.insert(users).values({
      id,
      displayName: id,
      createdAt: new Date(Date.UTC(2026, 0, index + 1)),
    });
  }
});

afterAll(async () => {
  await db.close();
});

function makeHandler() {
  return makeUserCronHandler(
    {
      isConfigured: () => true,
      getDb: () => db,
      getCronSecret: () => SECRET,
      now: () => new Date(),
    },
    {
      start: (): { users: string[] } => ({ users: [] }),
      runUser: ({ userId, totals }) => {
        totals.users.push(userId);
        return Promise.resolve();
      },
    },
  );
}

describe("a user cron handler", () => {
  // The proxy lets every request under /api/cron/ through without a
  // Referer, so the handler must refuse a request without the secret.
  it.each([undefined, "Bearer wrong-secret"])(
    "refuses the Authorization header %s",
    async (authorization) => {
      const response = await makeHandler()(
        new Request("https://assistant.qingqi.dev/api/cron/test", {
          headers: authorization ? { Authorization: authorization } : {},
        }),
      );
      expect(response.status).toBe(401);
    },
  );

  it("runs the job for every user, from a random one on, each with a fair share of the time left", async () => {
    let clock = 0;
    const runs: { userId: string; endsAt: number }[] = [];
    const handler = makeUserCronHandler(
      {
        isConfigured: () => true,
        getDb: () => db,
        getCronSecret: () => SECRET,
        now: () => new Date(clock),
        random: () => 0.5,
      },
      {
        budgetMs: 100,
        start: () => ({}),
        runUser: ({ userId, endsAt }) => {
          runs.push({ userId, endsAt });
          clock += 10;
          return Promise.resolve();
        },
      },
    );
    const response = await handler(
      new Request("https://assistant.qingqi.dev/api/cron/test", {
        headers: { Authorization: `Bearer ${SECRET}` },
      }),
    );
    expect(response.status).toBe(200);
    expect(runs).toEqual([
      { userId: userIds[1], endsAt: 50 },
      { userId: userIds[0], endsAt: 100 },
    ]);
  });
});
