import { describe, expect, test } from "vitest";
import { buildSyntheticRows } from "../dev/seed/build-synthetic-rows.ts";
import { createFxIndex } from "../domain/balance/create-fx-index.ts";
import { addMonths } from "../domain/dates/add-months.ts";
import { createTransactionAmount } from "../domain/transactions/create-transaction-amount.ts";
import {
  buildAnalyticsIndex,
  type AnalyticsIndexSource,
} from "./build-analytics-index.ts";
import {
  DEFAULT_ANALYTICS_STATE,
  computeAnalyticsView,
} from "./compute-analytics-view.ts";
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
});
