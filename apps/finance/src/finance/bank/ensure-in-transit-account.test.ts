import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { accounts } from "../db/schema.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import { mutation } from "../db/testing/mutation.ts";
import {
  seedTestHousehold,
  type SeededHousehold,
} from "../db/testing/seed-test-household.ts";
import { applyMutations } from "../sync/apply-mutations.ts";
import { runServerWrite } from "../sync/run-server-write.ts";
import { ensureInTransitAccount } from "./ensure-in-transit-account.ts";

const NOW = new Date("2026-10-10T12:00:00Z");

let db: TestDb;
let home: SeededHousehold;

beforeEach(async () => {
  db = await createTestDb();
  home = await seedTestHousehold(db);
});

afterEach(async () => {
  await db.close();
});

async function ensure(currency: string) {
  const { result } = await runServerWrite(
    db,
    home.householdId,
    NOW,
    (context) => ensureInTransitAccount(context, currency),
  );
  return result;
}

function systemAccounts() {
  return db
    .select()
    .from(accounts)
    .where(
      and(
        eq(accounts.householdId, home.householdId),
        eq(accounts.isSystem, true),
      ),
    );
}

async function push(...mutations: ReturnType<typeof mutation>[]) {
  return applyMutations(
    db,
    home.householdId,
    { clientId: "00000000-0000-4000-8000-00000000c001", mutations },
    NOW,
  );
}

describe("ensureInTransitAccount", () => {
  it("refuses a second live In transit account in one currency", async () => {
    await ensure("GBP");
    await expect(
      db.insert(accounts).values({
        id: randomUUID(),
        householdId: home.householdId,
        groupId: home.liquidGroupId,
        name: "In transit",
        kind: "cash",
        currency: "GBP",
        isSystem: true,
        version: 0,
      }),
    ).rejects.toThrow();
  });
});

describe("In transit guards", () => {
  it("lets a member move it, and nothing else", async () => {
    const id = await ensure("GBP");

    const moved = await push(mutation("upsertAccount", { id, position: 7 }));
    expect(moved.rejected).toEqual([]);

    const refused = await push(
      mutation("upsertAccount", { id, name: "Float" }),
      mutation("upsertAccount", { id, closedOn: "2026-10-10" }),
      mutation("upsertAccount", { id, excludedFromNetWorth: true }),
      mutation("upsertAccount", { id, deleted: true }),
      mutation("putValuation", {
        id: randomUUID(),
        accountId: id,
        on: "2026-10-10",
        amountMinor: 100,
      }),
    );
    expect(refused.rejected.map((rejection) => rejection.reason)).toEqual([
      "invalid",
      "invalid",
      "invalid",
      "invalid",
      "invalid",
    ]);

    const [row] = await systemAccounts();
    expect(row).toMatchObject({
      name: "In transit",
      position: 7,
      closedOn: null,
      excludedFromNetWorth: false,
      deletedAt: null,
    });
  });
});
