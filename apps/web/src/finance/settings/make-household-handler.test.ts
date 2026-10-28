import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FinanceSession } from "../auth/types.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import { seedTestHousehold } from "../db/testing/seed-test-household.ts";
import { makeHouseholdHandler } from "./make-household-handler.ts";

const ORIGIN = "http://localhost:3000";

let db: TestDb;
let session: FinanceSession;

beforeEach(async () => {
  db = await createTestDb();
  const home = await seedTestHousehold(db);
  session = {
    sessionId: randomUUID(),
    userId: randomUUID(),
    householdId: home.householdId,
    memberId: home.memberId,
    role: "owner",
  };
});

afterEach(async () => {
  await db.close();
});

function patch(body: unknown, origin: string | null = ORIGIN) {
  const handler = makeHouseholdHandler({
    isConfigured: () => true,
    getDb: () => db,
    getSession: () => Promise.resolve(session),
    now: () => new Date("2026-10-10T09:00:00Z"),
  });
  return handler(
    new Request(`${ORIGIN}/api/finance/household`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(origin === null ? {} : { Origin: origin }),
      },
      body: JSON.stringify(body),
    }),
  );
}

describe("makeHouseholdHandler", () => {
  it("refuses an unknown timezone, a base currency change and a cross-site request", async () => {
    expect((await patch({ timezone: "Mars/Olympus" })).status).toBe(400);
    expect((await patch({ baseCurrency: "USD" })).status).toBe(400);
    expect((await patch({ name: "x" }, "https://evil.example")).status).toBe(
      403,
    );
  });

  it("lets only the owner change the Household", async () => {
    session = { ...session, role: "member" };

    const response = await patch({ name: "Mine now" });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "owner-only" });
  });
});
