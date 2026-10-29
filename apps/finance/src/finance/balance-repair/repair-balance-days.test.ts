import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { BalanceDrift } from "../db/repositories/balance-drift-repository.ts";
import { householdRepository } from "../db/repositories/household-repository.ts";
import { recomputeDerived } from "../db/repositories/recompute-derived.ts";
import {
  accountBalanceDays,
  balanceDriftDays,
  valuations,
} from "../db/schema.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import { insertTestExpense } from "../db/testing/insert-test-expense.ts";
import { mutation } from "../db/testing/mutation.ts";
import {
  seedTestHousehold,
  type SeededHousehold,
} from "../db/testing/seed-test-household.ts";
import { withHousehold } from "../db/with-household.ts";
import { applyMutations } from "../sync/apply-mutations.ts";
import { pullChanges } from "../sync/pull-changes.ts";
import { repairBalanceDays } from "./repair-balance-days.ts";

const NOW = new Date("2026-10-13T03:30:00Z");
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

async function push(...mutations: ReturnType<typeof mutation>[]) {
  const result = await applyMutations(
    db,
    home.householdId,
    { clientId: CLIENT, mutations },
    NOW,
  );
  expect(result.rejected).toEqual([]);
}

function expense(id: string, date: string, amountMinor: number) {
  return mutation("createTransaction", {
    id,
    kind: "expense",
    date,
    categoryId: home.groceriesId,
    entries: [{ id: randomUUID(), accountId: home.currentId, amountMinor }],
  });
}

async function clock() {
  const household = await withHousehold(db, home.householdId, (scope) =>
    householdRepository.find(scope),
  );
  return household?.clock ?? 0;
}

async function repair(onDrift?: (drift: BalanceDrift) => Promise<void>) {
  const drifts: BalanceDrift[] = [];
  const pending: Promise<void>[] = [];
  const result = await repairBalanceDays(db, home.householdId, NOW, (drift) => {
    drifts.push(drift);
    if (onDrift) pending.push(onDrift(drift));
  });
  await Promise.all(pending);
  return { ...result, drifts };
}

/** How many rows a full rebuild changes: 0 when every stored balance is right. */
async function fullRebuild() {
  const written = await withHousehold(db, home.householdId, (scope) =>
    recomputeDerived({ ...scope, version: 1_000_000 }, { accounts: "all" }),
  );
  return written.balanceDays;
}

async function queued() {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(balanceDriftDays);
  return rows[0]?.count ?? 0;
}

const EXPENSES = {
  first: "00000000-0000-4000-8000-000000000005",
  second: "00000000-0000-4000-8000-000000000010",
  third: "00000000-0000-4000-8000-000000000015",
};
const VALUATION_ID = "00000000-0000-4000-8000-0000000000a1";

/**
 * The Current account through app writes: a Valuation of 100,000 on
 * 1 September, then expenses on the 5th, 10th and 15th. The stored balances
 * are 100,000, 99,000, 97,000 and 94,000. The queue is empty after it.
 */
async function seedLedger() {
  await push(
    mutation("putValuation", {
      id: VALUATION_ID,
      accountId: home.currentId,
      on: "2026-09-01",
      amountMinor: 100_000,
    }),
    expense(EXPENSES.first, "2026-09-05", -1_000),
    expense(EXPENSES.second, "2026-09-10", -2_000),
    expense(EXPENSES.third, "2026-09-15", -3_000),
  );
  expect((await repair()).drifts).toEqual([]);
  expect(await queued()).toBe(0);
}

async function insertRawExpense(date: string, amountMinor: number) {
  await insertTestExpense(db, home, home.currentId, date, amountMinor);
}

function onCurrent(day: string) {
  return and(
    eq(accountBalanceDays.accountId, home.currentId),
    eq(accountBalanceDays.day, day),
  );
}

describe("repairBalanceDays", () => {
  it("reports nothing after app writes, and empties the queue", async () => {
    await seedLedger();
    await push(
      expense(randomUUID(), "2026-08-20", -400),
      mutation("updateTransaction", {
        id: EXPENSES.second,
        patch: { date: "2026-09-20" },
      }),
      mutation("updateTransaction", {
        id: EXPENSES.third,
        patch: {
          entries: [
            {
              id: randomUUID(),
              accountId: home.currentId,
              amountMinor: -3_500,
            },
          ],
        },
      }),
      mutation("deleteTransaction", { id: EXPENSES.first }),
      mutation("putValuation", {
        id: randomUUID(),
        accountId: home.currentId,
        on: "2026-09-12",
        amountMinor: 50_000,
      }),
      mutation("deleteValuation", { id: VALUATION_ID }),
    );
    await push(mutation("restoreTransaction", { id: EXPENSES.first }));
    expect(await queued()).toBeGreaterThan(0);
    const before = await clock();

    const result = await repair();

    expect(result.drifts).toEqual([]);
    expect(result.checked).toBeGreaterThan(0);
    expect(await queued()).toBe(0);
    expect(await clock()).toBe(before);
    expect(await fullRebuild()).toBe(0);
  });

  it.each<{
    name: string;
    edit: () => Promise<unknown>;
    drift: Omit<BalanceDrift, "accountId">;
  }>([
    {
      name: "an Entry inserted",
      edit: () => insertRawExpense("2026-09-12", -500),
      drift: {
        day: "2026-09-12",
        expectedMinor: 96_500,
        storedMinor: null,
        wrongDays: 1,
      },
    },
    {
      name: "a Valuation edited",
      edit: () =>
        db
          .update(valuations)
          .set({ amountMinor: 200_000 })
          .where(eq(valuations.id, VALUATION_ID)),
      drift: {
        day: "2026-09-01",
        expectedMinor: 200_000,
        storedMinor: 100_000,
        wrongDays: 1,
      },
    },
    {
      name: "a stored balance edited",
      edit: () =>
        db
          .update(accountBalanceDays)
          .set({ balanceMinor: 1 })
          .where(onCurrent("2026-09-10")),
      drift: {
        day: "2026-09-10",
        expectedMinor: 97_000,
        storedMinor: 1,
        wrongDays: 2,
      },
    },
  ])(
    "queues, finds, repairs and reports $name once",
    async ({ edit, drift }) => {
      await seedLedger();
      const before = await clock();

      await edit();
      expect(await queued()).toBeGreaterThan(0);
      const result = await repair();

      expect(result.drifts).toEqual([{ accountId: home.currentId, ...drift }]);
      expect(await fullRebuild()).toBe(0);
      expect(await clock()).toBe(before + 1);
      const pulled = await pullChanges(db, home.householdId, before);
      expect(pulled.clock).toBe(before + 1);
      expect(pulled.tables.accountBalanceDays?.length).toBeGreaterThan(0);

      const next = await repair();
      expect(next.drifts).toEqual([]);
      expect(await queued()).toBe(0);
      expect(await clock()).toBe(before + 1);
    },
  );

  it("queues every remaining account day after a TRUNCATE", async () => {
    await seedLedger();

    await db.execute(sql`truncate account_balance_days`);
    const result = await repair();

    expect(result.drifts).toEqual([
      {
        accountId: home.currentId,
        day: "2026-09-01",
        expectedMinor: 100_000,
        storedMinor: null,
        wrongDays: 4,
      },
    ]);
    expect(await fullRebuild()).toBe(0);
  });

  it("keeps the rows queued while a check runs, and checks them on the next run", async () => {
    await seedLedger();
    await insertRawExpense("2026-09-12", -500);

    const first = await repair(() => insertRawExpense("2026-09-14", -700));

    expect(first.drifts.map((drift) => drift.day)).toEqual(["2026-09-12"]);
    expect(await queued()).toBeGreaterThan(0);
    const second = await repair();
    expect(second.drifts).toEqual([
      {
        accountId: home.currentId,
        day: "2026-09-14",
        expectedMinor: 96_500 - 700,
        storedMinor: null,
        wrongDays: 1,
      },
    ]);
    expect(await fullRebuild()).toBe(0);
  });
});
