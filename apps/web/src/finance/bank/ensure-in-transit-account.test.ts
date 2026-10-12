import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { accountGroups, accounts } from "../db/schema.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import {
  seedTestHousehold,
  type SeededHousehold,
} from "../db/testing/seed-test-household.ts";
import { applyMutations } from "../sync/apply-mutations.ts";
import type { MutationInput, MutationName } from "../sync/mutation-schema.ts";
import { runServerWrite } from "../sync/run-server-write.ts";
import { ensureInTransitAccount } from "./ensure-in-transit-account.ts";

const NOW = new Date("2026-10-10T12:00:00Z");
const DB_HOOK_TIMEOUT = 60_000;

let db: TestDb;
let home: SeededHousehold;

beforeEach(async () => {
  db = await createTestDb();
  home = await seedTestHousehold(db);
}, DB_HOOK_TIMEOUT);

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

function mutation<Name extends MutationName>(
  name: Name,
  args: Extract<MutationInput, { name: Name }>["args"],
) {
  return { id: randomUUID(), name, args };
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
  it("makes one Shared cash account per currency, at the end of the first asset Group", async () => {
    const gbp = await ensure("GBP");
    expect(await ensure("GBP")).toBe(gbp);
    const usd = await ensure("USD");
    expect(usd).not.toBe(gbp);

    const rows = await systemAccounts();
    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.id === gbp)).toMatchObject({
      name: "In transit",
      kind: "cash",
      currency: "GBP",
      groupId: home.liquidGroupId,
      ownerMemberId: null,
      excludedFromNetWorth: false,
      position: 1,
    });
  });

  it("makes a Cash Group when the Household has no asset Group", async () => {
    await db
      .update(accounts)
      .set({ deletedAt: NOW })
      .where(eq(accounts.householdId, home.householdId));
    await db
      .update(accountGroups)
      .set({ deletedAt: NOW })
      .where(eq(accountGroups.id, home.liquidGroupId));

    const id = await ensure("GBP");

    const [account] = await systemAccounts();
    expect(account.id).toBe(id);
    const [group] = await db
      .select()
      .from(accountGroups)
      .where(eq(accountGroups.id, account.groupId));
    expect(group).toMatchObject({ name: "Cash", side: "asset" });
  });

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
