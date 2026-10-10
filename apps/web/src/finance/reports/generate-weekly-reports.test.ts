import { randomUUID } from "node:crypto";
import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  accounts,
  entries,
  fxRates,
  households,
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
import { weekdayOf } from "../domain/dates/start-of-week.ts";
import { generateWeeklyReports } from "./generate-weekly-reports.ts";
import {
  TREND_AVERAGE_WEEKS,
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
    .select({ amountMinor: transactions.amountMinor })
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
  return rows.reduce((sum, row) => sum - row.amountMinor, 0);
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
  const fx = createFxIndex(await db.select().from(fxRates), "GBP");
  engineNetWorthAt = (day) => netWorthAt(accountRows, series, fx, day);
}, DB_HOOK_TIMEOUT);

afterAll(async () => {
  await db.close();
});

describe("generateWeeklyReports data", () => {
  it("covers Monday to Sunday", () => {
    expect(report.periodStart).toBe("2026-09-28");
    expect(report.periodEnd).toBe(PERIOD_END);
  });

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

  it("keeps a weekly trend with its moving average", () => {
    const { trend } = report;
    expect(trend.length).toBeGreaterThan(150);
    for (const [index, point] of trend.entries()) {
      expect(weekdayOf(point.day)).toBe(7);
      if (index > 0) expect(point.day).toBe(addDays(trend[index - 1].day, 7));
    }
    expect(trend[10].netWorthMinor).toBe(engineNetWorthAt(trend[10].day));

    const weight = 2 / (TREND_AVERAGE_WEEKS + 1);
    let average = trend[0].netWorthMinor;
    for (const point of trend) {
      average = average * (1 - weight) + point.netWorthMinor * weight;
      expect(Math.abs(point.averageMinor - average)).toBeLessThanOrEqual(1);
    }
  });

  it("nets property against the liability group named after it", () => {
    const property = report.groupNets.find((net) => net.name === "不动产");
    expect(property?.groupIds).toHaveLength(2);
    const groups = [
      ...report.balanceSheet.assets.groups,
      ...report.balanceSheet.liabilities.groups,
    ];
    const house = groups.find((group) => group.name === "不动产");
    const mortgage = groups.find((group) => group.name === "不动产负债");
    expect(report.propertyNetMinor).toBe(
      (house?.totalMinor ?? 0) + (mortgage?.totalMinor ?? 0),
    );
    expect(report.trend.at(-1)?.propertyNetMinor).toBe(report.propertyNetMinor);
    expect(sum(report.groupNets.map((net) => net.valueMinor))).toBe(
      report.balanceSheet.netWorthMinor,
    );
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

  it("marks the line of a system Category", () => {
    const system = report.spending.byCategory.filter((line) => line.isSystem);
    expect(system.map((line) => line.name)).toEqual(["Uncategorised"]);
    expect(report.spending.byMember.some((line) => line.isSystem)).toBe(false);
  });

  it("rolls categories up to their top level", () => {
    const names = report.spending.byCategory.map((line) => line.name);
    expect(names).not.toContain("超市");
    expect(new Set(names).size).toBe(names.length);
  });

  it("lists at most five payees, most spent first", () => {
    const { topPayees } = report;
    expect(topPayees.length).toBeGreaterThan(0);
    expect(topPayees.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < topPayees.length; i++) {
      expect(topPayees[i - 1].amountMinor).toBeGreaterThanOrEqual(
        topPayees[i].amountMinor,
      );
    }
    expect(report.transactionCount).toBeGreaterThan(0);
    expect(report.incomeMinor).toBeGreaterThanOrEqual(0);
  });
});

describe("generateWeeklyReports", () => {
  it(
    "backfills every week once and writes nothing on a second run",
    async () => {
      const [before] = await db.select().from(households);
      const first = await generateWeeklyReports(db, householdId, NOW, "all");
      expect(first.written).toBe(first.reports.length);
      expect(first.reports.at(-1)?.periodEnd).toBe(PERIOD_END);

      const stored = await db
        .select()
        .from(reports)
        .where(eq(reports.householdId, householdId));
      expect(stored).toHaveLength(first.reports.length);
      const last = stored.find((row) => row.periodEnd === PERIOD_END);
      expect(last?.data).toEqual(report);

      const second = await generateWeeklyReports(db, householdId, NOW, "all");
      expect(second.written).toBe(0);
      expect(second.unchanged).toBe(first.reports.length);
      const [after] = await db.select().from(households);
      expect(after.clock).toBe(before.clock);
    },
    DB_HOOK_TIMEOUT,
  );

  it(
    "deletes the reports before the first week on an all run only",
    async () => {
      const stale = await storeStaleReport(householdId, "2001-01-07");
      const last = await generateWeeklyReports(db, householdId, NOW, "last");
      const explicit = await generateWeeklyReports(db, householdId, NOW, [
        PERIOD_END,
      ]);
      expect([last.deleted, explicit.deleted]).toEqual([0, 0]);
      expect(await storedReportIds(householdId)).toContain(stale);

      const all = await generateWeeklyReports(db, householdId, NOW, "all");
      expect(all.deleted).toBe(1);
      const ids = await storedReportIds(householdId);
      expect(ids).not.toContain(stale);
      expect(ids).toHaveLength(all.reports.length);
    },
    DB_HOOK_TIMEOUT,
  );

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

  it("skips a week that has not ended", async () => {
    const result = await generateWeeklyReports(db, householdId, NOW, [TODAY]);
    expect(result.reports).toEqual([]);
  });
});
