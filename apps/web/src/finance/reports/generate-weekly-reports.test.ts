import { randomUUID } from "node:crypto";
import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  accounts,
  entries,
  exchangeRates,
  reports,
  transactions,
  valuations,
} from "../db/schema.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import { seedTestHousehold } from "../db/testing/seed-test-household.ts";
import { seedSyntheticHousehold } from "../dev/seed/seed-synthetic-household.ts";
import {
  computeBalanceDays,
  type BalanceSeries,
} from "../domain/balance/compute-balance-days.ts";
import { createFxIndex } from "../domain/balance/create-fx-index.ts";
import { netWorthAt } from "../domain/balance/net-worth-at.ts";
import { addDays } from "../domain/dates/add-days.ts";
import { createTransactionAmount } from "../domain/transactions/create-transaction-amount.ts";
import { generateWeeklyReports } from "./generate-weekly-reports.ts";
import {
  weeklyReportDataSchema,
  type WeeklyReportData,
} from "./weekly-report-data-schema.ts";

const TODAY = "2026-10-10";
const NOW = new Date("2026-10-10T12:00:00Z");
const PERIOD_END = "2026-10-04";
const DB_HOOK_TIMEOUT = 120_000;

let db: TestDb;
let householdId: string;
let report: WeeklyReportData;
let engineNetWorthAt: (day: string) => number;

async function spentBetween(from: string, to: string) {
  const rows = await db
    .select({
      id: transactions.id,
      kind: transactions.kind,
      date: transactions.date,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.householdId, householdId),
        eq(transactions.kind, "expense"),
        eq(transactions.status, "posted"),
        isNull(transactions.deletedAt),
        gte(transactions.date, from),
        lte(transactions.date, to),
      ),
    );
  const accountRows = new Map(
    (await db.select().from(accounts)).map((row) => [row.id, row]),
  );
  const entriesByTransaction = Map.groupBy(
    await db.select().from(entries).where(isNull(entries.deletedAt)),
    (entry) => entry.transactionId,
  );
  const amountOf = createTransactionAmount(
    createFxIndex(await db.select().from(exchangeRates), "GBP"),
    (id) => accountRows.get(id),
  );
  return rows.reduce(
    (sum, row) => sum - amountOf(row, entriesByTransaction.get(row.id) ?? []),
    0,
  );
}

/** Stores a Report of a week before any balance, as an older backfill could have left. */
async function storeStaleReport(household: string, periodEnd: string) {
  const id = randomUUID();
  await db.insert(reports).values({
    id,
    householdId: household,
    periodStart: addDays(periodEnd, -6),
    periodEnd,
    data: {},
    version: 1,
  });
  return id;
}

async function storedReportIds(household: string) {
  const rows = await db
    .select({ id: reports.id })
    .from(reports)
    .where(eq(reports.householdId, household));
  return rows.map((row) => row.id);
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

beforeAll(async () => {
  db = await createTestDb();
  ({ householdId } = await seedSyntheticHousehold(db, { today: TODAY }));
  await generateWeeklyReports(db, householdId, NOW, [PERIOD_END]);
  const [stored] = await db
    .delete(reports)
    .where(eq(reports.householdId, householdId))
    .returning();
  report = weeklyReportDataSchema.parse(stored.data);

  const accountRows = await db.select().from(accounts);
  const valuationRows = await db
    .select()
    .from(valuations)
    .where(isNull(valuations.deletedAt));
  const entryRows = await db
    .select({
      accountId: entries.accountId,
      date: entries.date,
      amountMinor: entries.amountMinor,
      status: transactions.status,
    })
    .from(entries)
    .innerJoin(transactions, eq(transactions.id, entries.transactionId))
    .where(and(isNull(entries.deletedAt), isNull(transactions.deletedAt)));
  const series = new Map<string, BalanceSeries>();
  for (const account of accountRows) {
    series.set(
      account.id,
      computeBalanceDays(
        valuationRows.filter((row) => row.accountId === account.id),
        entryRows.filter(
          (row) => row.accountId === account.id && row.status === "posted",
        ),
      ),
    );
  }
  const fx = createFxIndex(await db.select().from(exchangeRates), "GBP");
  engineNetWorthAt = (day) => netWorthAt(accountRows, series, fx, day);
}, DB_HOOK_TIMEOUT);

afterAll(async () => {
  await db.close();
});

describe("generateWeeklyReports data", () => {
  it("adds accounts up to groups, groups to sides and sides to net worth", () => {
    const { assets, liabilities, netWorthMinor } = report.balanceSheet;
    for (const side of [assets, liabilities]) {
      for (const group of side.groups) {
        expect(sum(group.accounts.map((account) => account.baseMinor))).toBe(
          group.totalMinor,
        );
      }
      expect(sum(side.groups.map((group) => group.totalMinor))).toBe(
        side.totalMinor,
      );
    }
    expect(assets.totalMinor + liabilities.totalMinor).toBe(netWorthMinor);
    expect(assets.totalMinor).toBeGreaterThan(0);
    expect(liabilities.totalMinor).toBeLessThan(0);
  });

  it("adds the changes of the groups up to the change in net worth", () => {
    const { assets, liabilities } = report.balanceSheet;
    const groups = [...assets.groups, ...liabilities.groups];
    for (const group of groups) {
      expect(
        sum(group.accounts.map((account) => account.previousBaseMinor)),
      ).toBe(group.previousTotalMinor);
    }
    expect(sum(groups.map((group) => group.previousTotalMinor))).toBe(
      report.comparisons.previousWeek.netWorthMinor,
    );
    expect(
      sum(groups.map((group) => group.totalMinor - group.previousTotalMinor)),
    ).toBe(report.comparisons.previousWeek.changeMinor);
    expect(
      groups.some((group) => group.totalMinor !== group.previousTotalMinor),
    ).toBe(true);
  });

  it("states the net worth the engine gives from raw rows", () => {
    expect(report.balanceSheet.netWorthMinor).toBe(
      engineNetWorthAt(PERIOD_END),
    );
    expect(report.trend.at(-1)?.netWorthMinor).toBe(
      report.balanceSheet.netWorthMinor,
    );
  });

  it("leaves out excluded and closed accounts", () => {
    const names = [
      ...report.balanceSheet.assets.groups,
      ...report.balanceSheet.liabilities.groups,
    ].flatMap((group) => group.accounts.map((account) => account.name));
    expect(names).not.toContain("Work Expenses");
    expect(names).not.toContain("Old Current Account");
    expect(names).toContain("US Brokerage");
  });

  it("compares with a week, four weeks and the year start before", () => {
    const { previousWeek, fourWeeksAgo, yearStart } = report.comparisons;
    const netWorth = report.balanceSheet.netWorthMinor;
    expect(previousWeek.day).toBe("2026-09-27");
    expect(fourWeeksAgo.day).toBe("2026-09-06");
    expect(yearStart.day).toBe("2025-12-31");
    for (const comparison of [previousWeek, fourWeeksAgo, yearStart]) {
      expect(comparison.netWorthMinor).toBe(engineNetWorthAt(comparison.day));
      expect(comparison.changeMinor).toBe(netWorth - comparison.netWorthMinor);
    }
  });

  it("adds the week's spending up to the raw total", async () => {
    const { spending } = report;
    const spent = await spentBetween(report.periodStart, PERIOD_END);
    expect(spent).toBeGreaterThan(0);
    expect(spending.totalMinor).toBe(spent);
    expect(sum(spending.byCategory.map((line) => line.amountMinor))).toBe(
      spent,
    );
    expect(sum(spending.byMember.map((line) => line.amountMinor))).toBe(spent);

    const previous = await spentBetween(
      addDays(report.periodStart, -28),
      addDays(report.periodStart, -1),
    );
    expect(spending.averageMinor).toBe(Math.round(previous / 4));
    expect(spending.changeMinor).toBe(spent - spending.averageMinor);
    expect(spending.byMember.map((line) => line.name)).toContain("Alex");
  });
});

describe("generateWeeklyReports", () => {
  beforeEach(async () => {
    await db.delete(reports);
  });

  it("deletes nothing when no account has a balance yet", async () => {
    const empty = await seedTestHousehold(db, "empty");
    const stale = await storeStaleReport(empty.householdId, "2001-01-07");
    const result = await generateWeeklyReports(
      db,
      empty.householdId,
      NOW,
      "all",
    );
    expect(result).toMatchObject({ reports: [], deleted: 0 });
    expect(await storedReportIds(empty.householdId)).toEqual([stale]);
  });
});
