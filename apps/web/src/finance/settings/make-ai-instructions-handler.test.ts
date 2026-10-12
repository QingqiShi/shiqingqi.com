import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FinanceSession } from "../auth/types.ts";
import { householdRepository } from "../db/repositories/household-repository.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import { seedTestHousehold } from "../db/testing/seed-test-household.ts";
import { withHousehold } from "../db/with-household.ts";
import { makeAiInstructionsHandler } from "./make-ai-instructions-handler.ts";

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
    memberId: home.partnerId,
    role: "member",
  };
}, 60_000);

afterEach(async () => {
  await db.close();
}, 60_000);

function patch(body: unknown, origin = ORIGIN) {
  const handler = makeAiInstructionsHandler({
    isConfigured: () => true,
    getDb: () => db,
    getSession: () => Promise.resolve(session),
    now: () => new Date("2026-10-10T09:00:00Z"),
  });
  return handler(
    new Request(`${ORIGIN}/api/finance/household/ai-instructions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify(body),
    }),
  );
}

function find() {
  return withHousehold(db, session.householdId, (scope) =>
    householdRepository.find(scope),
  );
}

describe("makeAiInstructionsHandler", () => {
  it("lets any Member save the instructions, and moves the clock", async () => {
    const before = await find();

    const response = await patch({ aiInstructions: "  J SMITH is rent.  " });

    expect(response.status).toBe(200);
    const after = await find();
    expect(after?.aiInstructions).toBe("J SMITH is rent.");
    expect(after?.clock).toBe((before?.clock ?? 0) + 1);
    expect(await response.json()).toEqual({ clock: after?.clock });
  });

  it("refuses text that is too long, another field, or another origin", async () => {
    expect((await patch({ aiInstructions: "x".repeat(8001) })).status).toBe(
      400,
    );
    expect((await patch({ aiInstructions: "", name: "Ours" })).status).toBe(
      400,
    );
    expect(
      (await patch({ aiInstructions: "" }, "https://evil.example")).status,
    ).toBe(403);
    expect((await find())?.aiInstructions).toBe("");
  });
});
