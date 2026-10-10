import { eq, getTableColumns, getTableName } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
  accountBalanceDays,
  accountGroups,
  accounts,
  categories,
  entries,
  fxRates,
  households,
  members,
  monthTotals,
  payeeAliases,
  payees,
  rules,
  tags,
  transactions,
  transactionTags,
  valuations,
} from "../../db/schema.ts";
import { createTestDb } from "../../db/testing/create-test-db.ts";
import {
  computeBalanceDays,
  type BalanceSeries,
} from "../../domain/balance/compute-balance-days.ts";
import { createFxIndex } from "../../domain/balance/create-fx-index.ts";
import { netWorthAt } from "../../domain/balance/net-worth-at.ts";
import { readBalanceState } from "../../import/moneythings/read-balance-state.ts";
import { seedSyntheticHousehold } from "./seed-synthetic-household.ts";

const TODAY = "2026-09-30";
const SMALL = { years: 2, transactionsPerYear: 400, today: TODAY };

const tables: Record<string, PgTable> = {
  households,
  members,
  accountGroups,
  accounts,
  categories,
  payees,
  payeeAliases,
  tags,
  rules,
  valuations,
  transactions,
  entries,
  transactionTags,
  accountBalanceDays,
  monthTotals,
  fxRates,
};

/** Every row of every table, without the columns the database fills with the time of the write. */
async function snapshot(db: Awaited<ReturnType<typeof createTestDb>>) {
  const result: Record<string, string[]> = {};
  for (const [name, table] of Object.entries(tables)) {
    const volatile = new Set(
      Object.entries(getTableColumns(table))
        .filter(
          ([, column]) =>
            column.hasDefault && column.columnType === "PgTimestamp",
        )
        .map(([field]) => field),
    );
    const rows: Record<string, unknown>[] = await db.select().from(table);
    result[getTableName(table)] = rows
      .map((row) =>
        JSON.stringify(
          Object.fromEntries(
            Object.entries(row).filter(([field]) => !volatile.has(field)),
          ),
        ),
      )
      .sort();
    expect(name).toBeTruthy();
  }
  return result;
}

async function seeded(options: Parameters<typeof seedSyntheticHousehold>[1]) {
  const db = await createTestDb();
  const household = await seedSyntheticHousehold(db, options);
  return { db, household };
}

describe("seedSyntheticHousehold", () => {
  it("gives identical data for the same seed and different data for another", async () => {
    const first = await seeded({ ...SMALL, seed: 7 });
    const second = await seeded({ ...SMALL, seed: 7 });
    const other = await seeded({ ...SMALL, seed: 8 });
    try {
      const a = await snapshot(first.db);
      expect(await snapshot(second.db)).toEqual(a);
      expect(await snapshot(other.db)).not.toEqual(a);
    } finally {
      await first.db.close();
      await second.db.close();
      await other.db.close();
    }
  }, 120_000);

  it("stores balances that equal the domain engine's, net worth included", async () => {
    const { db, household } = await seeded(SMALL);
    try {
      const state = await readBalanceState(db, household.householdId);
      const valuationRows = await db.select().from(valuations);
      const entryRows = await db
        .select({
          accountId: entries.accountId,
          date: entries.date,
          amountMinor: entries.amountMinor,
          status: transactions.status,
        })
        .from(entries)
        .innerJoin(transactions, eq(transactions.id, entries.transactionId));
      const engineSeries = new Map<string, BalanceSeries>();
      for (const account of state.accounts) {
        engineSeries.set(
          account.id,
          computeBalanceDays(
            valuationRows.filter((v) => v.accountId === account.id),
            entryRows.filter(
              (e) => e.accountId === account.id && e.status === "posted",
            ),
          ),
        );
      }
      const fx = createFxIndex(state.fxRates, "GBP");
      for (const day of ["2024-10-31", "2025-06-15", "2026-03-31", TODAY]) {
        const stored = netWorthAt(
          state.accounts,
          state.seriesByAccount,
          fx,
          day,
        );
        const engine = netWorthAt(state.accounts, engineSeries, fx, day);
        expect(stored).toBe(engine);
      }
      expect(
        netWorthAt(state.accounts, state.seriesByAccount, fx, TODAY),
      ).toBeGreaterThan(0);
    } finally {
      await db.close();
    }
  }, 120_000);

  it("has the shape the Finance screens need", async () => {
    const { db, household } = await seeded(SMALL);
    try {
      const [home] = await db.select().from(households);
      expect(home.name).toBe("Home");
      expect(home.clock).toBe(household.version);
      expect(
        (
          await db
            .select({ name: members.name, role: members.role })
            .from(members)
        ).sort((a, b) => a.name.localeCompare(b.name)),
      ).toEqual([
        { name: "Alex", role: "owner" },
        { name: "Sam", role: "member" },
      ]);

      const accountRows = await db.select().from(accounts);
      expect(accountRows.length).toBeGreaterThanOrEqual(15);
      expect(new Set(accountRows.map((a) => a.kind))).toEqual(
        new Set([
          "cash",
          "credit",
          "investment",
          "property",
          "loan",
          "receivable",
        ]),
      );
      expect(accountRows.filter((a) => a.closedOn)).toHaveLength(1);
      expect(accountRows.filter((a) => a.excludedFromNetWorth)).toHaveLength(1);
      expect(accountRows.filter((a) => a.currency === "USD")).toHaveLength(1);
      expect(accountRows.filter((a) => a.kind === "credit")).toHaveLength(3);

      const categoryRows = await db.select().from(categories);
      expect(categoryRows.some((c) => c.parentId)).toBe(true);
      expect(categoryRows.some((c) => c.kind === "income" && c.parentId)).toBe(
        true,
      );
      expect((await db.select().from(payees)).length).toBeGreaterThanOrEqual(
        40,
      );

      const transactionRows = await db.select().from(transactions);
      expect(
        transactionRows.filter((t) => t.needsReview).length,
      ).toBeGreaterThanOrEqual(3);
      expect(
        transactionRows.filter((t) => t.status === "expected").length,
      ).toBeGreaterThan(0);
      expect(
        transactionRows.filter((t) => t.refundOfId).length,
      ).toBeGreaterThan(0);
      expect(
        transactionRows.filter((t) => t.kind === "transfer").length,
      ).toBeGreaterThan(0);
      expect(transactionRows.filter((t) => t.ruleId).length).toBeGreaterThan(0);
      expect(
        transactionRows.filter((t) => t.source === "bank").length,
      ).toBeGreaterThan(0);
      expect(transactionRows.every((t) => t.date <= "2026-10-07")).toBe(true);

      const perYear =
        transactionRows.filter((t) => t.status === "posted").length / 2;
      expect(perYear).toBeGreaterThan(340);
      expect(perYear).toBeLessThan(480);
      expect((await db.select().from(tags)).length).toBeGreaterThan(0);
      expect((await db.select().from(fxRates)).length).toBeGreaterThan(100);
    } finally {
      await db.close();
    }
  }, 120_000);

  it("keeps every current and savings balance above zero", async () => {
    const { db, household } = await seeded({ ...SMALL, seed: 1 });
    try {
      const state = await readBalanceState(db, household.householdId);
      const accountRows = await db.select().from(accounts);
      for (const account of accountRows.filter((a) => a.kind === "cash")) {
        const series = state.seriesByAccount.get(account.id);
        const lowest = Math.min(...(series?.balances ?? [0]));
        expect(lowest, account.name).toBeGreaterThanOrEqual(0);
      }
    } finally {
      await db.close();
    }
  }, 120_000);

  it("refuses to seed the same household twice", async () => {
    const { db } = await seeded(SMALL);
    try {
      await expect(seedSyntheticHousehold(db, SMALL)).rejects.toThrow(
        /already exists/,
      );
    } finally {
      await db.close();
    }
  }, 120_000);
});
