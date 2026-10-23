import { describe, expect, test } from "vitest";
import { buildSyntheticRows } from "../dev/seed/build-synthetic-rows.ts";
import { createFxIndex } from "../domain/balance/create-fx-index.ts";
import { addMonths } from "../domain/dates/add-months.ts";
import { createTransactionAmount } from "../domain/transactions/create-transaction-amount.ts";
import { expectWithinBudget } from "../testing/expect-within-budget.ts";
import {
  buildAnalyticsIndex,
  type AnalyticsIndexSource,
} from "./build-analytics-index.ts";
import {
  DEFAULT_ANALYTICS_STATE,
  computeAnalyticsView,
  type AnalyticsState,
} from "./compute-analytics-view.ts";
import { ANALYTICS_RANGES } from "./resolve-analytics-range.ts";
import { buildTestIndex, postedRow } from "./testing/build-test-index.ts";

const TODAY = "2026-10-10";

function syntheticSource(transactionsPerYear: number): AnalyticsIndexSource {
  const rows = buildSyntheticRows({
    years: 3,
    transactionsPerYear,
    seed: 4,
    today: TODAY,
    version: 2,
  });
  const transactions = rows.transactions.map((row) => ({
    id: row.id,
    kind: row.kind,
    status: row.status ?? "posted",
    date: row.date,
    categoryId: row.categoryId ?? null,
    payeeId: row.payeeId ?? null,
    memberId: row.memberId ?? null,
    deletedAt: null,
  }));
  const accounts = new Map(rows.accounts.map((row) => [row.id, row]));
  const amountOf = createTransactionAmount(
    createFxIndex(rows.exchangeRates, "GBP"),
    (id) => accounts.get(id),
  );
  const entriesByTransaction = Map.groupBy(
    rows.entries.map((entry) => ({ ...entry, position: entry.position ?? 0 })),
    (entry) => entry.transactionId,
  );
  return {
    transactions,
    amounts: new Map(
      transactions.map((row) => [
        row.id,
        amountOf(row, entriesByTransaction.get(row.id) ?? []),
      ]),
    ),
    transactionTags: rows.transactionTags.map((row) => ({
      transactionId: row.transactionId,
      tagId: row.tagId,
      deletedAt: null,
    })),
    categories: rows.categories.map((row) => ({
      id: row.id,
      parentId: row.parentId ?? null,
    })),
    payees: rows.payees.map((row) => ({ id: row.id })),
    members: Object.values(rows.memberIds).map((id) => ({ id })),
    tags: rows.tags.map((row) => ({ id: row.id })),
  };
}

describe("computeAnalyticsView at 60k Transactions", () => {
  const source = syntheticSource(20_000);
  const index = buildAnalyticsIndex(source);

  test("holds every posted expense and income", () => {
    expect(index.length).toBeGreaterThan(50_000);
  });

  test("switches any range in well under a frame", () => {
    const parent = source.categories.find((category) =>
      source.categories.some((child) => child.parentId === category.id),
    );
    const states: AnalyticsState[] = [];
    for (const range of ANALYTICS_RANGES) {
      for (const kind of ["spending", "income", "net"] as const) {
        states.push({ ...DEFAULT_ANALYTICS_STATE, range, kind });
      }
      states.push({
        ...DEFAULT_ANALYTICS_STATE,
        range,
        member: index.memberIds[0],
        category: parent?.id ?? null,
        excludeOutliers: true,
      });
      states.push({
        ...DEFAULT_ANALYTICS_STATE,
        range,
        grouping: "day",
        category: parent?.id ?? null,
        dimension: "transaction",
      });
    }
    for (const state of states) computeAnalyticsView(index, state, TODAY);
    const medians: number[] = [];
    const slowestRun = 0;
    for (const state of states) {
      const runs: number[] = [];
      for (let run = 0; run < 5; run++) {
        const started = performance.now();
        const view = computeAnalyticsView(index, state, TODAY);
        runs.push(performance.now() - started);
        expect(view.boundaries.length).toBeGreaterThan(1);
      }
      runs.sort((a, b) => a - b);
      medians.push(runs[2]);
    }
    medians.sort((a, b) => a - b);
    const slowest = medians[medians.length - 1];
    console.info(
      `analytics view at ${String(index.length)} rows, ${String(states.length)} states: median ${medians[medians.length >> 1].toFixed(2)} ms, slowest state ${slowest.toFixed(2)} ms, slowest single run ${slowestRun.toFixed(2)} ms`,
    );
    expectWithinBudget(slowest, 16);
  });

  test("builds the index in a few frames", () => {
    const started = performance.now();
    const built = buildAnalyticsIndex(source);
    const elapsed = performance.now() - started;
    console.info(`analytics index build: ${elapsed.toFixed(1)} ms`);
    expect(built.length).toBe(index.length);
    expectWithinBudget(elapsed, 250);
  });
});

describe("computeAnalyticsView", () => {
  const source = syntheticSource(1500);
  const index = buildAnalyticsIndex(source);

  test("opens a parent to its children and compares with the period before", () => {
    const top = computeAnalyticsView(
      index,
      { ...DEFAULT_ANALYTICS_STATE, range: "12M" },
      TODAY,
    );
    const shares = top.rows.reduce((sum, row) => sum + row.share, 0);
    expect(shares).toBeCloseTo(1, 6);
    expect(top.rows.reduce((sum, row) => sum + row.value, 0)).toBeCloseTo(
      top.total,
      6,
    );
    expect(top.previousTotal).not.toBeNull();
    expect(top.path).toEqual([]);

    const parent = top.rows.find((row) => row.hasChildren);
    expect(parent).toBeDefined();
    if (!parent?.categoryId) return;
    const opened = computeAnalyticsView(
      index,
      { ...DEFAULT_ANALYTICS_STATE, range: "12M", category: parent.categoryId },
      TODAY,
    );
    expect(opened.path).toEqual([parent.categoryId]);
    expect(opened.total).toBe(parent.value);
    expect(opened.trend?.categoryId).toBe(parent.categoryId);
    const trendTotal = Array.from(opened.trend?.values ?? []).reduce(
      (sum, value) => sum + value,
      0,
    );
    expect(trendTotal).toBeCloseTo(parent.value, 6);
  });

  test("excludes outliers from the trend when asked", () => {
    const top = computeAnalyticsView(
      index,
      { ...DEFAULT_ANALYTICS_STATE, range: "all" },
      TODAY,
    );
    const category = top.rows[0].categoryId;
    const base = {
      ...DEFAULT_ANALYTICS_STATE,
      range: "all" as const,
      category,
      dimension: "transaction" as const,
    };
    const all = computeAnalyticsView(index, base, TODAY).trend;
    const kept = computeAnalyticsView(
      index,
      { ...base, excludeOutliers: true },
      TODAY,
    ).trend;
    expect(all && kept).toBeTruthy();
    if (!all || !kept) return;
    expect(kept.values.length).toBe(all.values.length - all.outlierCount);
    expect(kept.excluded).toBe(true);
  });

  test("keeps the grouping asked for over the whole history", () => {
    const view = computeAnalyticsView(
      index,
      { ...DEFAULT_ANALYTICS_STATE, range: "all", grouping: "week" },
      TODAY,
    );
    expect(view.grouping).toBe("week");
    expect(view.boundaries.length - 1).toBeGreaterThan(104);
  });
});

describe("computeAnalyticsView with the current month cut short", () => {
  const months = Array.from({ length: 11 }, (_, at) =>
    addMonths("2025-11-05", at),
  );
  const index = buildTestIndex(
    [
      ...months.map((date, at) =>
        postedRow(`t${String(at)}`, date, -(100_00 + at * 10_00), "food"),
      ),
      postedRow("today", "2026-10-05", -10_00, "food"),
    ],
    ["food"],
  );
  const view = computeAnalyticsView(
    index,
    { ...DEFAULT_ANALYTICS_STATE, range: "12M", category: "food" },
    TODAY,
  );

  test("marks October as running and leaves it out of the trend figures", () => {
    expect(view.grouping).toBe("month");
    expect(Array.from(view.partial)).toEqual([
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
    ]);
    expect(view.lastPeriodOngoing).toBe(true);
    expect(view.trend?.stats).toEqual({
      max: 200_00,
      min: 100_00,
      average: 150_00,
      count: 11,
      partialLeftOut: true,
    });
  });

  test("averages the whole months only", () => {
    expect(view.total).toBe(1_650_00 + 10_00);
    expect(view.periodAverage).toBe(150_00);
  });

  test("keeps a running month when it is the only one", () => {
    const thisMonth = computeAnalyticsView(
      index,
      {
        ...DEFAULT_ANALYTICS_STATE,
        range: "thisMonth",
        grouping: "month",
        category: "food",
      },
      TODAY,
    );
    expect(thisMonth.trend?.stats).toMatchObject({
      min: 10_00,
      count: 1,
      partialLeftOut: false,
    });
    expect(thisMonth.periodAverage).toBe(10_00);
  });

  test("does not mark a past month that ends with the range", () => {
    const lastMonth = computeAnalyticsView(
      index,
      { ...DEFAULT_ANALYTICS_STATE, range: "lastMonth", grouping: "month" },
      TODAY,
    );
    expect(Array.from(lastMonth.partial)).toEqual([0]);
    expect(lastMonth.lastPeriodOngoing).toBe(false);
  });
});
