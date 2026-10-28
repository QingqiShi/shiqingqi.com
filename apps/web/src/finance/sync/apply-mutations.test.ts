import { randomUUID } from "node:crypto";
import { and, asc, eq, isNull } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  accountBalanceDays,
  entries,
  transactions,
  valuations,
} from "../db/schema.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import { mutation } from "../db/testing/mutation.ts";
import {
  seedTestHousehold,
  type SeededHousehold,
} from "../db/testing/seed-test-household.ts";
import {
  balanceSeriesToRows,
  computeBalanceDays,
} from "../domain/balance/compute-balance-days.ts";
import { applyMutations } from "./apply-mutations.ts";
import { pullChanges } from "./pull-changes.ts";
import type { PushRequest } from "./push-request-schema.ts";

const NOW = new Date("2026-10-10T12:00:00Z");
/** Matches any Date; typed `unknown` so it is not an `any` in the expectations. */
const A_DATE: unknown = expect.any(Date);
const CLIENT = "00000000-0000-4000-8000-00000000c001";

let db: TestDb;
let home: SeededHousehold;

beforeEach(async () => {
  db = await createTestDb();
  home = await seedTestHousehold(db);
});

afterEach(async () => {
  await db.close();
});

function push(
  mutations: PushRequest["mutations"],
  clientId = CLIENT,
  householdId = home.householdId,
) {
  return applyMutations(db, householdId, { clientId, mutations }, NOW);
}

function expense(
  id: string,
  date: string,
  amountMinor: number,
  household = home,
  accountId = household.currentId,
) {
  return mutation("createTransaction", {
    id,
    kind: "expense",
    date,
    categoryId: household.groceriesId,
    payeeId: household.grocerId,
    memberId: household.memberId,
    entries: [{ id: randomUUID(), accountId, amountMinor }],
  });
}

async function storedBalanceDays(accountId: string) {
  return db
    .select({
      day: accountBalanceDays.day,
      balanceMinor: accountBalanceDays.balanceMinor,
    })
    .from(accountBalanceDays)
    .where(
      and(
        eq(accountBalanceDays.accountId, accountId),
        isNull(accountBalanceDays.deletedAt),
      ),
    )
    .orderBy(asc(accountBalanceDays.day));
}

/** The balance days the domain engine gives from the account's stored rows. */
async function engineBalanceDays(accountId: string) {
  const valuationRows = await db
    .select({ on: valuations.on, amountMinor: valuations.amountMinor })
    .from(valuations)
    .where(
      and(eq(valuations.accountId, accountId), isNull(valuations.deletedAt)),
    );
  const entryRows = await db
    .select({ date: entries.date, amountMinor: entries.amountMinor })
    .from(entries)
    .innerJoin(transactions, eq(transactions.id, entries.transactionId))
    .where(
      and(
        eq(entries.accountId, accountId),
        isNull(entries.deletedAt),
        isNull(transactions.deletedAt),
        eq(transactions.status, "posted"),
      ),
    );
  return balanceSeriesToRows(computeBalanceDays(valuationRows, entryRows));
}

describe("applyMutations", () => {
  it("creates a transfer with two entries and keeps account_balance_days equal to computeBalanceDays", async () => {
    const transferId = randomUUID();
    const result = await push([
      mutation("putValuation", {
        id: randomUUID(),
        accountId: home.currentId,
        on: "2026-09-30",
        amountMinor: 100_000,
      }),
      expense(randomUUID(), "2026-10-02", -2_500),
      mutation("createTransaction", {
        id: transferId,
        kind: "transfer",
        date: "2026-10-03",
        entries: [
          { id: randomUUID(), accountId: home.currentId, amountMinor: -50_000 },
          { id: randomUUID(), accountId: home.savingsId, amountMinor: 50_000 },
        ],
        tagIds: [home.trainTagId],
      }),
    ]);

    expect(result.rejected).toEqual([]);
    expect(result.applied).toHaveLength(3);
    expect(result.clock).toBe(1);
    const transferEntries = await db
      .select()
      .from(entries)
      .where(eq(entries.transactionId, transferId));
    expect(transferEntries).toHaveLength(2);
    expect(transferEntries.every((entry) => entry.version === 1)).toBe(true);

    for (const accountId of [home.currentId, home.savingsId]) {
      expect(await storedBalanceDays(accountId)).toEqual(
        await engineBalanceDays(accountId),
      );
    }
    expect(await storedBalanceDays(home.currentId)).toEqual([
      { day: "2026-09-30", balanceMinor: 100_000 },
      { day: "2026-10-02", balanceMinor: 97_500 },
      { day: "2026-10-03", balanceMinor: 47_500 },
    ]);
  });

  it("keeps balances right when a back-dated entry lands before a valuation", async () => {
    await push([
      expense(randomUUID(), "2026-09-01", -1_000),
      mutation("putValuation", {
        id: randomUUID(),
        accountId: home.currentId,
        on: "2026-09-10",
        amountMinor: 5_000,
      }),
      expense(randomUUID(), "2026-09-20", -500),
    ]);
    await push([expense(randomUUID(), "2026-09-05", -300)]);

    expect(await storedBalanceDays(home.currentId)).toEqual(
      await engineBalanceDays(home.currentId),
    );
    expect(await storedBalanceDays(home.currentId)).toEqual([
      { day: "2026-09-01", balanceMinor: -1_000 },
      { day: "2026-09-05", balanceMinor: -1_300 },
      { day: "2026-09-10", balanceMinor: 5_000 },
      { day: "2026-09-20", balanceMinor: 4_500 },
    ]);
  });

  it("sends a soft delete, derived rows included, to the next pull", async () => {
    const id = randomUUID();
    const created = await push([expense(id, "2026-10-01", -700)]);
    const deleted = await push([mutation("deleteTransaction", { id })]);
    expect(deleted.clock).toBe(created.clock + 1);

    const pull = await pullChanges(db, home.householdId, created.clock);
    expect(pull.clock).toBe(deleted.clock);
    expect(pull.tables.transactions).toEqual([
      expect.objectContaining({ id, deletedAt: A_DATE }),
    ]);
    expect(pull.tables.entries).toEqual([
      expect.objectContaining({
        transactionId: id,
        deletedAt: A_DATE,
      }),
    ]);
    expect(pull.tables.accountBalanceDays).toEqual([
      expect.objectContaining({
        day: "2026-10-01",
        deletedAt: A_DATE,
      }),
    ]);
    expect(pull.tables.accounts).toBeUndefined();
  });

  it("applies a re-pushed batch once", async () => {
    const batch = [expense(randomUUID(), "2026-10-01", -700)];
    const first = await push(batch);
    const second = await push(batch);

    expect(second).toEqual({
      applied: first.applied,
      rejected: [],
      clock: first.clock,
      effects: new Set(),
    });
    expect(await db.$count(transactions)).toBe(1);
  });

  it("serialises two concurrent batches", async () => {
    const [a, b] = await Promise.all([
      push([expense(randomUUID(), "2026-10-01", -100)], CLIENT),
      push(
        [expense(randomUUID(), "2026-10-02", -200)],
        "00000000-0000-4000-8000-00000000c002",
      ),
    ]);

    expect([a.clock, b.clock].sort()).toEqual([1, 2]);
    const first = a.clock < b.clock ? a : b;
    const later = await pullChanges(db, home.householdId, first.clock);
    expect(later.tables.transactions).toHaveLength(1);
    const all = await pullChanges(db, home.householdId, 0);
    expect(all.tables.transactions).toHaveLength(2);
    expect(await storedBalanceDays(home.currentId)).toEqual([
      { day: "2026-10-01", balanceMinor: -100 },
      { day: "2026-10-02", balanceMinor: -300 },
    ]);
  });

  it("rejects a fraction of a minor unit and an account of another Household", async () => {
    const other = await seedTestHousehold(db, "other");
    const foreignAccount = expense(
      randomUUID(),
      "2026-10-01",
      -1,
      home,
      other.currentId,
    );
    const fraction = expense(randomUUID(), "2026-10-01", 1.5);

    const result = await push([foreignAccount, fraction]);

    expect(result.applied).toEqual([]);
    expect(result.rejected.map((rejection) => rejection.reason)).toEqual([
      "invalid",
      "invalid",
    ]);
    expect(result.clock).toBe(0);
  });

  it("forbids writing a row that belongs to another household", async () => {
    const other = await seedTestHousehold(db, "other");
    const theirs = randomUUID();
    await push(
      [expense(theirs, "2026-10-01", -1, other)],
      CLIENT,
      other.householdId,
    );

    const result = await push([
      expense(theirs, "2026-10-01", -1),
      mutation("deleteTransaction", { id: theirs }),
    ]);

    expect(result.rejected.map((rejection) => rejection.reason)).toEqual([
      "forbidden",
      "not_found",
    ]);
  });
});
