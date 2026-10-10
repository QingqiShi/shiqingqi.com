import { and, asc, eq, isNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  balanceSeriesToRows,
  computeBalanceDays,
} from "../../domain/balance/compute-balance-days.ts";
import { addDays } from "../../domain/dates/add-days.ts";
import { nameBasedUuid } from "../../ids/name-based-uuid.ts";
import { expectWithinBudget } from "../../testing/expect-within-budget.ts";
import {
  accountBalanceDays,
  accounts,
  entries,
  monthTotals,
  transactions,
  valuations,
} from "../schema.ts";
import { createTestDb, type TestDb } from "../testing/create-test-db.ts";
import {
  seedTestHousehold,
  type SeededHousehold,
} from "../testing/seed-test-household.ts";
import { recomputeDerived } from "./recompute-derived.ts";

const ACCOUNTS = 400;
const TRANSACTIONS = 6000;
const VALUATIONS = 1600;

let db: TestDb;
let home: SeededHousehold;
let accountIds: string[];

/** A fixed pseudo-random sequence, so every run builds the same ledger. */
function random(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return state / 2_147_483_648;
  };
}

async function insertInChunks<T>(
  rows: T[],
  insert: (chunk: T[]) => Promise<unknown>,
) {
  for (let i = 0; i < rows.length; i += 1000) {
    await insert(rows.slice(i, i + 1000));
  }
}

beforeAll(async () => {
  db = await createTestDb();
  home = await seedTestHousehold(db);
  const { householdId } = home;
  const next = random(42);
  function pick<T>(items: readonly T[]): T {
    const item = items[Math.floor(next() * items.length)];
    if (item === undefined) throw new Error("Nothing to pick from");
    return item;
  }
  const day = () => addDays("2016-01-01", Math.floor(next() * 3900));

  accountIds = Array.from({ length: ACCOUNTS }, (_, i) =>
    nameBasedUuid(`bulk:account:${String(i)}`),
  );
  await db.insert(accounts).values(
    accountIds.map((id, i) => ({
      id,
      householdId,
      groupId: home.liquidGroupId,
      name: `Account ${String(i)}`,
      kind: "cash" as const,
      currency: "GBP",
      closedOn: i % 5 === 0 ? "2024-01-01" : null,
      version: 1,
    })),
  );

  const transactionRows: (typeof transactions.$inferInsert)[] = [];
  const entryRows: (typeof entries.$inferInsert)[] = [];
  for (let i = 0; i < TRANSACTIONS; i++) {
    const id = nameBasedUuid(`bulk:transaction:${String(i)}`);
    const date = day();
    const amountMinor = -Math.floor(next() * 50_000);
    const transfer = i % 4 === 0;
    transactionRows.push({
      id,
      householdId,
      kind: transfer ? "transfer" : "expense",
      date,
      amountMinor: transfer ? 0 : amountMinor,
      categoryId: transfer ? null : home.groceriesId,
      memberId: pick([home.memberId, home.partnerId, null]),
      version: 1,
    });
    entryRows.push({
      id: nameBasedUuid(`bulk:entry:${String(i)}:0`),
      householdId,
      transactionId: id,
      accountId: pick(accountIds),
      date,
      amountMinor,
      version: 1,
    });
    if (transfer) {
      entryRows.push({
        id: nameBasedUuid(`bulk:entry:${String(i)}:1`),
        householdId,
        transactionId: id,
        accountId: pick(accountIds),
        date,
        amountMinor: -amountMinor,
        position: 1,
        version: 1,
      });
    }
  }
  await insertInChunks(transactionRows, (chunk) =>
    db.insert(transactions).values(chunk),
  );
  await insertInChunks(entryRows, (chunk) => db.insert(entries).values(chunk));

  const valuationKeys = new Set<string>();
  const valuationRows: (typeof valuations.$inferInsert)[] = [];
  while (valuationRows.length < VALUATIONS) {
    const accountId = pick(accountIds);
    const on = day();
    if (valuationKeys.has(`${accountId}|${on}`)) continue;
    valuationKeys.add(`${accountId}|${on}`);
    valuationRows.push({
      id: nameBasedUuid(`bulk:valuation:${String(valuationRows.length)}`),
      householdId,
      accountId,
      on,
      amountMinor: Math.floor(next() * 1_000_000),
      version: 1,
    });
  }
  await insertInChunks(valuationRows, (chunk) =>
    db.insert(valuations).values(chunk),
  );
}, 60_000);

afterAll(async () => {
  await db.close();
});

async function engineRows(accountId: string) {
  const valuationRows = await db
    .select({ on: valuations.on, amountMinor: valuations.amountMinor })
    .from(valuations)
    .where(eq(valuations.accountId, accountId));
  const entryRows = await db
    .select({ date: entries.date, amountMinor: entries.amountMinor })
    .from(entries)
    .where(and(eq(entries.accountId, accountId), isNull(entries.deletedAt)));
  return balanceSeriesToRows(computeBalanceDays(valuationRows, entryRows));
}

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

describe("recomputeDerived", () => {
  it("builds every derived row for an imported ledger in one pass", async () => {
    const started = performance.now();
    const written = await recomputeDerived(
      db,
      home.householdId,
      { accounts: "all", months: "all" },
      1,
    );
    const elapsed = performance.now() - started;

    expectWithinBudget(elapsed, 5_000);
    expect(written.balanceDays).toBeGreaterThan(7_000);
    expect(written.monthTotals).toBeGreaterThan(100);
    for (const accountId of accountIds.slice(0, 25)) {
      expect(await storedRows(accountId)).toEqual(await engineRows(accountId));
    }
  });

  it("writes nothing when run again", async () => {
    expect(
      await recomputeDerived(
        db,
        home.householdId,
        { accounts: "all", months: "all" },
        2,
      ),
    ).toEqual({ balanceDays: 0, monthTotals: 0 });
  });

  it("from a day on, changes only the rows that moved", async () => {
    const accountId = accountIds[1] ?? "";
    const before = await storedRows(accountId);
    const middle = before.at(Math.floor(before.length / 2));
    if (!middle) throw new Error("The account has no balances");
    await db
      .update(entries)
      .set({ amountMinor: 0 })
      .where(
        and(eq(entries.accountId, accountId), eq(entries.date, middle.day)),
      );

    const written = await recomputeDerived(
      db,
      home.householdId,
      { accounts: new Map([[accountId, middle.day]]), months: new Set() },
      3,
    );

    expect(await storedRows(accountId)).toEqual(await engineRows(accountId));
    const changed = await db
      .select({ day: accountBalanceDays.day })
      .from(accountBalanceDays)
      .where(eq(accountBalanceDays.version, 3));
    expect(changed.length).toBe(written.balanceDays);
    expect(changed.every((row) => row.day >= middle.day)).toBe(true);
    expect(await db.$count(monthTotals, eq(monthTotals.version, 3))).toBe(0);
  });
});
