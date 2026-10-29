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
    readOnly: false,
  };
});

afterEach(async () => {
  await db.close();
});

function patch(body: unknown, origin = ORIGIN) {
  const handler = makeAiInstructionsHandler({
    isConfigured: () => true,
    getDb: () => db,
    getSession: () => Promise.resolve(session),
    now: () => new Date("2026-10-10T09:00:00Z"),
  });
  return handler(
    new Request(`${ORIGIN}/api/household/ai-instructions`, {
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

  it("adds a taught line at the end, or changes the line it replaces, on the text as it is now", async () => {
    await patch({ aiInstructions: "J SMITH is rent.\nTesco is groceries." });

    expect(
      (
        await patch({
          change: { replaces: null, line: "TFL TRAVEL is the commute." },
        })
      ).status,
    ).toBe(200);
    expect((await find())?.aiInstructions).toBe(
      "J SMITH is rent.\nTesco is groceries.\nTFL TRAVEL is the commute.",
    );

    await patch({
      change: {
        replaces: "Tesco is groceries.",
        line: "Tesco is groceries; TESCO MOBILE is the phone bill.",
      },
    });
    await patch({
      change: { replaces: "A line since removed", line: "Boots is health." },
    });
    expect((await find())?.aiInstructions).toBe(
      "J SMITH is rent.\nTesco is groceries; TESCO MOBILE is the phone bill.\nTFL TRAVEL is the commute.\nBoots is health.",
    );
  });
});
