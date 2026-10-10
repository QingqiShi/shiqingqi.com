import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  accountBalanceDays,
  appliedMutations,
  categories,
  entries,
  households,
  members,
  monthTotals,
  transactions,
  valuations,
} from "../../db/schema.ts";
import { createTestDb, type TestDb } from "../../db/testing/create-test-db.ts";
import {
  ImportRefusedError,
  importMoneyThings,
} from "./import-money-things.ts";
import { mapMoneyThings } from "./map-money-things.ts";
import { mapOptionsFor } from "./map-options-for.ts";
import { readBalanceState } from "./read-balance-state.ts";
import { readSourceRows } from "./read-source-rows.ts";
import {
  createFixtureStore,
  FIXTURE_MANIFEST,
} from "./testing/create-fixture-store.ts";
import { verifyBalances } from "./verify-import.ts";

const store = createFixtureStore();
const source = readSourceRows(store, FIXTURE_MANIFEST);
store.close();
const options = mapOptionsFor(source, {
  groupOverrides: { Cottage: "property" },
  memberNames: { husband: "Alex", wife: "Sam" },
});
const { rows } = mapMoneyThings(source, options);

let db: TestDb;

beforeEach(async () => {
  db = await createTestDb();
});

afterEach(async () => {
  await db.close();
});

async function snapshot() {
  const strip = (list: { version: number }[]) =>
    list
      .map(({ version: _version, ...rest }) =>
        JSON.stringify(rest, (key: string, value: unknown) =>
          key === "createdAt" || key === "updatedAt" ? undefined : value,
        ),
      )
      .sort();
  return {
    transactions: strip(await db.select().from(transactions)),
    entries: strip(await db.select().from(entries)),
    valuations: strip(await db.select().from(valuations)),
    balanceDays: strip(await db.select().from(accountBalanceDays)),
    monthTotals: strip(await db.select().from(monthTotals)),
  };
}

describe("importMoneyThings", () => {
  it("creates the household and members and stores balances that match MoneyThings", async () => {
    const result = await importMoneyThings(db, rows, {
      options,
      householdName: "Home",
    });
    expect(result.createdHousehold).toBe(true);

    const memberRows = await db
      .select({ name: members.name, role: members.role })
      .from(members)
      .where(eq(members.householdId, options.householdId));
    expect(memberRows).toEqual(
      expect.arrayContaining([
        { name: "Alex", role: "owner" },
        { name: "Sam", role: "member" },
      ]),
    );
    expect(await db.select().from(transactions)).toHaveLength(
      rows.transactions.length,
    );

    const { checks, netWorthMinor } = verifyBalances(
      await readBalanceState(db, options.householdId),
      source,
      {
        baseCurrency: options.baseCurrency,
        timeZone: options.timeZone,
        asOf: options.importDate,
        asOfTime: options.importedAt,
        historyDates: ["2026-01-01", "2026-01-05", "2026-01-09", "2026-01-12"],
      },
    );
    expect(checks.filter((check) => !check.ok)).toEqual([]);
    expect(netWorthMinor).toBe(30_001_239);

    const [searchable] = await db
      .select({ searchText: transactions.searchText })
      .from(transactions)
      .where(eq(transactions.note, "Pay"));
    expect(searchable.searchText).toContain("pay");
  });

  it("gives the same rows when it runs again, with a new version", async () => {
    const first = await importMoneyThings(db, rows, {
      options,
      householdName: "Home",
    });
    const before = await snapshot();
    const second = await importMoneyThings(db, rows, {
      options,
      householdName: "Home",
    });
    expect(second.createdHousehold).toBe(false);
    expect(second.staleRows).toBe(0);
    expect(second.version).toBeGreaterThan(first.version);
    expect(await snapshot()).toEqual(before);
    const [household] = await db.select().from(households);
    expect(household.clock).toBe(second.version);
    expect(
      await db.select().from(categories).where(eq(categories.isSystem, true)),
    ).toHaveLength(2);
  });

  it("refuses to import again over changes made in the app, unless forced", async () => {
    const first = await importMoneyThings(db, rows, {
      options,
      householdName: "Home",
    });
    await db.insert(appliedMutations).values({
      householdId: first.householdId,
      clientId: "00000000-0000-4000-8000-00000000c003",
      mutationId: "00000000-0000-4000-8000-00000000d003",
    });

    await expect(
      importMoneyThings(db, rows, { options, householdName: "Home" }),
    ).rejects.toThrow(ImportRefusedError);
    const forced = await importMoneyThings(db, rows, {
      options,
      householdName: "Home",
      force: true,
    });

    expect(forced.version).toBeGreaterThan(first.version);
  });

  it("soft-deletes imported rows that a newer backup no longer has", async () => {
    await importMoneyThings(db, rows, { options, householdName: "Home" });
    const dropped = rows.transactions[0];
    const result = await importMoneyThings(
      db,
      {
        ...rows,
        transactions: rows.transactions.slice(1),
        entries: rows.entries.filter((e) => e.transactionId !== dropped.id),
        transactionTags: rows.transactionTags.filter(
          (t) => t.transactionId !== dropped.id,
        ),
      },
      { options, householdName: "Home" },
    );
    expect(result.staleRows).toBeGreaterThanOrEqual(2);
    const [row] = await db
      .select({ deletedAt: transactions.deletedAt })
      .from(transactions)
      .where(eq(transactions.id, dropped.id));
    expect(row.deletedAt).not.toBeNull();
  });
});
