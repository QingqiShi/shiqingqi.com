import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addDays } from "../../domain/dates/add-days.ts";
import { nameBasedUuid } from "../../ids/name-based-uuid.ts";
import {
  accountBalanceDays,
  accounts,
  entries,
  transactions,
  valuations,
} from "../schema.ts";
import { createTestDb, type TestDb } from "../testing/create-test-db.ts";
import { insertTestExpense } from "../testing/insert-test-expense.ts";
import {
  seedTestHousehold,
  type SeededHousehold,
} from "../testing/seed-test-household.ts";
import { withHousehold } from "../with-household.ts";
import { recomputeDerived } from "./recompute-derived.ts";

let db: TestDb;
let home: SeededHousehold;

beforeAll(async () => {
  db = await createTestDb();
  home = await seedTestHousehold(db);
});

afterAll(async () => {
  await db.close();
});

async function storedRows(accountId: string) {
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

let nextId = 0;

async function addAccount() {
  const id = nameBasedUuid(`edits:account:${String(nextId++)}`);
  await db.insert(accounts).values({
    id,
    householdId: home.householdId,
    groupId: home.liquidGroupId,
    name: `Edits ${id}`,
    kind: "cash",
    currency: "GBP",
    version: 1,
  });
  return id;
}

function addExpense(accountId: string, date: string, amountMinor: number) {
  return insertTestExpense(db, home, accountId, date, amountMinor);
}

async function moveExpense(transactionId: string, date: string) {
  await db
    .update(transactions)
    .set({ date })
    .where(eq(transactions.id, transactionId));
  await db
    .update(entries)
    .set({ date })
    .where(eq(entries.transactionId, transactionId));
}

async function addValuation(
  accountId: string,
  on: string,
  amountMinor: number,
) {
  const id = nameBasedUuid(`edits:valuation:${String(nextId++)}`);
  await db.insert(valuations).values({
    id,
    householdId: home.householdId,
    accountId,
    on,
    amountMinor,
    version: 1,
  });
  return id;
}

let nextVersion = 10;

async function recomputeFrom(fromByAccount: Record<string, string>) {
  const version = nextVersion++;
  const written = await withHousehold(db, home.householdId, (scope) =>
    recomputeDerived(
      { ...scope, version },
      { accounts: new Map(Object.entries(fromByAccount)) },
    ),
  );
  return { version, written: written.balanceDays };
}

/**
 * A full rebuild of these accounts finds nothing to change when the stored
 * rows are right. It starts before every row, so no stored balance seeds it.
 */
async function expectSameAsFullRebuild(accountIds: readonly string[]) {
  const version = nextVersion++;
  const written = await withHousehold(db, home.householdId, (scope) =>
    recomputeDerived(
      { ...scope, version },
      { accounts: new Map(accountIds.map((id) => [id, "1900-01-01"])) },
    ),
  );
  expect(written.balanceDays).toBe(0);
}

describe("recomputeDerived", () => {
  it("from a day on, ends as a full rebuild would after many edits", async () => {
    const own = await addAccount();
    const other = await addAccount();
    const days = Array.from({ length: 12 }, (_, i) =>
      addDays("2020-01-01", i * 10),
    );
    const expenses: string[] = [];
    for (const day of days) {
      expenses.push(await addExpense(own, day, -1_000));
      await addExpense(other, day, -500);
    }
    const valuationId = await addValuation(own, days[5] ?? "", 50_000);
    await recomputeFrom({ [own]: days[0] ?? "", [other]: days[0] ?? "" });
    await expectSameAsFullRebuild([own, other]);

    await addExpense(own, "2019-12-01", -200);
    await recomputeFrom({ [own]: "2019-12-01" });
    await expectSameAsFullRebuild([own, other]);

    await addExpense(own, "2020-01-15", -300);
    await addExpense(other, days[10] ?? "", -400);
    await recomputeFrom({ [own]: "2020-01-15", [other]: days[10] ?? "" });
    await expectSameAsFullRebuild([own, other]);

    await addValuation(own, days[8] ?? "", 80_000);
    await recomputeFrom({ [own]: days[8] ?? "" });
    await expectSameAsFullRebuild([own, other]);

    await db
      .update(valuations)
      .set({ deletedAt: sql`now()` })
      .where(eq(valuations.id, valuationId));
    await recomputeFrom({ [own]: days[5] ?? "" });
    await expectSameAsFullRebuild([own, other]);

    await db
      .update(transactions)
      .set({ deletedAt: sql`now()` })
      .where(eq(transactions.id, expenses[3] ?? ""));
    await recomputeFrom({ [own]: days[3] ?? "" });
    await expectSameAsFullRebuild([own, other]);
    expect((await storedRows(own)).map((row) => row.day)).not.toContain(
      days[3],
    );

    await moveExpense(expenses[9] ?? "", "2020-02-02");
    await moveExpense(expenses[1] ?? "", days[11] ?? "");
    await recomputeFrom({ [own]: "2020-02-02" });
    await recomputeFrom({ [own]: days[1] ?? "" });
    await expectSameAsFullRebuild([own, other]);
    expect(await storedRows(own)).toEqual(
      expect.not.arrayContaining([expect.objectContaining({ day: days[9] })]),
    );
  });
});
