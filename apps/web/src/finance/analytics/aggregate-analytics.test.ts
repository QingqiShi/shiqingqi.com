import { describe, expect, test } from "vitest";
import { createPrng } from "../dev/seed/create-prng.ts";
import { addDays } from "../domain/dates/add-days.ts";
import { startOfMonth } from "../domain/dates/start-of-month.ts";
import { fromEpochDay, toEpochDay } from "../domain/dates/to-epoch-day.ts";
import { aggregateAnalytics } from "./aggregate-analytics.ts";
import {
  buildAnalyticsIndex,
  type AnalyticsIndexSource,
} from "./build-analytics-index.ts";
import { categoryBuckets } from "./category-buckets.ts";
import { periodBoundaries } from "./period-boundaries.ts";
import type { AnalyticsKind, Grouping } from "./types.ts";

type Source = AnalyticsIndexSource;
type Row = Source["transactions"][number];

const START = "2023-01-01";

function randomSource(seed: number, count: number) {
  const prng = createPrng(seed);
  const categories: { id: string; parentId: string | null }[] = [];
  for (let root = 0; root < 5; root++) {
    categories.push({ id: `root-${String(root)}`, parentId: null });
    for (let child = 0; child < 3; child++) {
      categories.push({
        id: `child-${String(root)}-${String(child)}`,
        parentId: `root-${String(root)}`,
      });
    }
  }
  const payees = Array.from({ length: 12 }, (_, i) => ({
    id: `p${String(i)}`,
  }));
  const members = [{ id: "alex" }, { id: "sam" }];
  const tags = Array.from({ length: 4 }, (_, i) => ({ id: `t${String(i)}` }));
  const transactions: Row[] = [];
  const transactionTags: Source["transactionTags"] extends Iterable<infer T>
    ? T[]
    : never = [];
  for (let i = 0; i < count; i++) {
    const kind = prng.pick([
      "expense",
      "expense",
      "expense",
      "income",
      "transfer",
    ]);
    const amount = Math.round(prng.next() * 20000) + 1;
    const refund = kind === "expense" && prng.next() < 0.1;
    const id = `tx-${String(i)}`;
    transactions.push({
      id,
      kind,
      status: prng.next() < 0.05 ? "expected" : "posted",
      date: addDays(START, Math.floor(prng.next() * 1100)),
      amountMinor:
        kind === "transfer"
          ? 0
          : kind === "income" || refund
            ? amount
            : -amount,
      categoryId: prng.next() < 0.05 ? null : prng.pick(categories).id,
      payeeId: prng.next() < 0.1 ? null : prng.pick(payees).id,
      memberId: prng.next() < 0.1 ? null : prng.pick(members).id,
      deletedAt: prng.next() < 0.03 ? "2026-01-01T00:00:00.000Z" : null,
    });
    for (const tag of tags) {
      if (prng.next() < 0.2) {
        transactionTags.push({
          transactionId: id,
          tagId: tag.id,
          deletedAt: prng.next() < 0.1 ? "2026-01-01T00:00:00.000Z" : null,
        });
      }
    }
  }
  return { categories, payees, members, tags, transactions, transactionTags };
}

/** What `month_totals` holds for the rows: per month, kind, Category and Member. */
function monthTotalsOf(rows: readonly Row[]) {
  const totals = new Map<
    string,
    Source["monthTotals"] extends Iterable<infer T> ? T : never
  >();
  for (const row of rows) {
    if (row.deletedAt !== null || row.status !== "posted") continue;
    if (row.kind === "transfer" || row.categoryId === null) continue;
    const month = startOfMonth(row.date);
    const key = `${month}|${row.kind}|${row.categoryId}|${row.memberId ?? ""}`;
    const total = totals.get(key) ?? {
      month,
      kind: row.kind,
      categoryId: row.categoryId,
      memberId: row.memberId,
      amountMinor: 0,
      count: 0,
      deletedAt: null,
    };
    total.amountMinor += row.amountMinor;
    total.count += 1;
    totals.set(key, total);
  }
  return [...totals.values()];
}

interface NaiveQuery {
  from: string;
  to: string;
  kind: AnalyticsKind;
  member: string | null;
  grouping: Grouping;
  bucketOf: (categoryId: string | null) => string | null;
  /** Rows before this day come from month totals. */
  rawFrom: string | null;
}

function naive(data: ReturnType<typeof randomSource>, query: NaiveQuery) {
  const starts = Array.from(
    periodBoundaries(query.from, query.to, query.grouping).subarray(0, -1),
    fromEpochDay,
  );
  const periodOf = (day: string) => {
    let period = -1;
    for (let i = 0; i < starts.length; i++) if (starts[i] <= day) period = i;
    return period;
  };
  const byBucket = new Map<string, number>();
  const byPeriod = new Array<number>(starts.length).fill(0);
  const byPayee = new Map<string, number>();
  const byTag = new Map<string, number>();
  const income = new Array<number>(starts.length).fill(0);
  const spending = new Array<number>(starts.length).fill(0);
  let total = 0;
  const rows: {
    date: string;
    kind: string;
    amountMinor: number;
    categoryId: string | null;
    memberId: string | null;
    payeeId: string | null;
    id: string | null;
  }[] = [];
  for (const row of data.transactions) {
    if (row.deletedAt !== null || row.status !== "posted") continue;
    if (row.kind === "transfer") continue;
    if (query.rawFrom !== null && row.date < query.rawFrom) continue;
    rows.push(row);
  }
  if (query.rawFrom !== null) {
    const rawFrom = query.rawFrom;
    const old = data.transactions.filter((row) => row.date < rawFrom);
    for (const total of monthTotalsOf(old)) {
      rows.push({ ...total, date: total.month, payeeId: null, id: null });
    }
  }
  for (const row of rows) {
    if (row.date < query.from || row.date > query.to) continue;
    if (query.member !== null && row.memberId !== query.member) continue;
    const period = periodOf(row.date);
    if (row.kind === "income") income[period] += row.amountMinor;
    else spending[period] -= row.amountMinor;
    if (query.kind === "spending" && row.kind !== "expense") continue;
    if (query.kind === "income" && row.kind !== "income") continue;
    const bucket = query.bucketOf(row.categoryId);
    if (bucket === null) continue;
    const value =
      query.kind === "spending" ? -row.amountMinor : row.amountMinor;
    total += value;
    byBucket.set(bucket, (byBucket.get(bucket) ?? 0) + value);
    byPeriod[period] += value;
    if (row.payeeId !== null) {
      byPayee.set(row.payeeId, (byPayee.get(row.payeeId) ?? 0) + value);
    }
    if (row.id !== null) {
      for (const link of data.transactionTags) {
        if (link.transactionId === row.id && link.deletedAt === null) {
          byTag.set(link.tagId, (byTag.get(link.tagId) ?? 0) + value);
        }
      }
    }
  }
  return { total, byBucket, byPeriod, byPayee, byTag, income, spending };
}

function sourceOf(
  data: ReturnType<typeof randomSource>,
  transactionsFrom: string | null,
): Source {
  return {
    ...data,
    monthTotals:
      transactionsFrom === null ? [] : monthTotalsOf(data.transactions),
    transactionsFrom,
  };
}

const rootOf = (id: string | null) =>
  id === null
    ? "none"
    : id.startsWith("child-")
      ? `root-${id.split("-")[1]}`
      : id;

describe("aggregateAnalytics", () => {
  const data = randomSource(7, 3000);

  test.each([
    {
      kind: "spending",
      member: null,
      grouping: "month",
      from: "2023-03-15",
      to: "2025-11-02",
      window: null,
    },
    {
      kind: "income",
      member: "alex",
      grouping: "week",
      from: "2024-02-07",
      to: "2024-08-30",
      window: null,
    },
    {
      kind: "net",
      member: "sam",
      grouping: "day",
      from: "2025-01-01",
      to: "2025-02-28",
      window: null,
    },
    {
      kind: "spending",
      member: null,
      grouping: "year",
      from: "2023-01-01",
      to: "2026-01-04",
      window: "2024-06-17",
    },
    {
      kind: "net",
      member: "alex",
      grouping: "month",
      from: "2023-05-01",
      to: "2025-12-31",
      window: "2024-01-01",
    },
  ] as const)(
    "matches a naive sum: $kind, $member, $grouping, window $window",
    ({ kind, member, grouping, from, to, window }) => {
      const index = buildAnalyticsIndex(sourceOf(data, window));
      const buckets = categoryBuckets(index, kind, -1);
      const boundaries = periodBoundaries(from, to, grouping);
      const result = aggregateAnalytics(index, {
        from: toEpochDay(from),
        to: toEpochDay(to),
        kind,
        member: member === null ? -1 : index.memberIds.indexOf(member),
        boundaries,
        bucketOf: buckets.bucketOf,
        bucketCount: buckets.count,
        breakdowns: true,
      });
      const rawFrom =
        window === null
          ? null
          : window.endsWith("-01")
            ? window
            : `${window.slice(0, 5)}${String(Number(window.slice(5, 7)) + 1).padStart(2, "0")}-01`;
      const expected = naive(data, {
        from,
        to,
        kind,
        member,
        grouping,
        bucketOf: rootOf,
        rawFrom,
      });

      expect(result.total).toBeCloseTo(expected.total, 6);
      expect(Array.from(result.byPeriod)).toEqual(expected.byPeriod);
      expect(Array.from(result.incomeByPeriod)).toEqual(expected.income);
      expect(Array.from(result.spendingByPeriod)).toEqual(expected.spending);
      for (let bucket = 0; bucket < buckets.count; bucket++) {
        const category = buckets.categories[bucket];
        const key =
          category === index.categoryIds.length
            ? "none"
            : index.categoryIds[category];
        expect(result.byBucket[bucket]).toBe(expected.byBucket.get(key) ?? 0);
      }
      index.payeeIds.forEach((payee, at) => {
        expect(result.byPayee?.[at]).toBe(expected.byPayee.get(payee) ?? 0);
      });
      index.tagIds.forEach((tag, at) => {
        expect(result.byTag?.[at]).toBe(expected.byTag.get(tag) ?? 0);
      });
    },
  );

  test("adds a parent's children and the parent itself apart when opened", () => {
    const index = buildAnalyticsIndex(sourceOf(data, null));
    const parent = index.categoryIds.indexOf("root-2");
    const buckets = categoryBuckets(index, "spending", parent);
    const boundaries = periodBoundaries("2023-01-01", "2026-01-31", "year");
    const result = aggregateAnalytics(index, {
      from: toEpochDay("2023-01-01"),
      to: toEpochDay("2026-01-31"),
      kind: "spending",
      member: -1,
      boundaries,
      bucketOf: buckets.bucketOf,
      bucketCount: buckets.count,
    });
    const expected = naive(data, {
      from: "2023-01-01",
      to: "2026-01-31",
      kind: "spending",
      member: null,
      grouping: "year",
      bucketOf: (id) =>
        id?.startsWith("child-2-") || id === "root-2" ? id : null,
      rawFrom: null,
    });
    expect(buckets.count).toBe(4);
    expect(buckets.directBucket).toBeGreaterThanOrEqual(0);
    for (let bucket = 0; bucket < buckets.count; bucket++) {
      const id = index.categoryIds[buckets.categories[bucket]];
      expect(result.byBucket[bucket]).toBe(expected.byBucket.get(id) ?? 0);
    }
    expect(result.total).toBe(expected.total);
  });

  test("nets a refund against its own Category", () => {
    const base = {
      status: "posted",
      payeeId: null,
      memberId: null,
      deletedAt: null,
    };
    const index = buildAnalyticsIndex({
      transactions: [
        {
          ...base,
          id: "a",
          kind: "expense",
          date: "2026-09-02",
          amountMinor: -5000,
          categoryId: "shopping",
        },
        {
          ...base,
          id: "b",
          kind: "expense",
          date: "2026-09-09",
          amountMinor: 2000,
          categoryId: "shopping",
        },
        {
          ...base,
          id: "c",
          kind: "expense",
          date: "2026-09-10",
          amountMinor: -700,
          categoryId: "food",
        },
        {
          ...base,
          id: "d",
          kind: "transfer",
          date: "2026-09-11",
          amountMinor: 0,
          categoryId: null,
        },
        {
          ...base,
          id: "e",
          kind: "income",
          date: "2026-09-12",
          amountMinor: 10000,
          categoryId: "salary",
        },
      ],
      transactionTags: [],
      categories: [
        { id: "shopping", parentId: null },
        { id: "food", parentId: null },
        { id: "salary", parentId: null },
      ],
      payees: [],
      members: [],
      tags: [],
      monthTotals: [],
      transactionsFrom: null,
    });
    const buckets = categoryBuckets(index, "spending", -1);
    const query = {
      from: toEpochDay("2026-09-01"),
      to: toEpochDay("2026-09-30"),
      member: -1,
      boundaries: periodBoundaries("2026-09-01", "2026-09-30", "month"),
      bucketOf: buckets.bucketOf,
      bucketCount: buckets.count,
    };
    const spending = aggregateAnalytics(index, { ...query, kind: "spending" });
    expect(spending.total).toBe(3700);
    expect(spending.byBucket[buckets.bucketOf[0]]).toBe(3000);
    expect(spending.byBucket[buckets.bucketOf[1]]).toBe(700);
    const net = aggregateAnalytics(index, { ...query, kind: "net" });
    expect(net.total).toBe(6300);
    expect(net.incomeByPeriod[0]).toBe(10000);
    expect(net.spendingByPeriod[0]).toBe(3700);
  });

  test("keeps colours by rank over all time, past eight as Other", () => {
    const categories = Array.from({ length: 10 }, (_, i) => ({
      id: `c${String(i)}`,
      parentId: null,
    }));
    const index = buildAnalyticsIndex({
      transactions: categories.map((category, i) => ({
        id: category.id,
        kind: "expense",
        status: "posted",
        date: "2026-01-01",
        amountMinor: -(i + 1) * 100,
        categoryId: category.id,
        payeeId: null,
        memberId: null,
        deletedAt: null,
      })),
      transactionTags: [],
      categories,
      payees: [],
      members: [],
      tags: [],
      monthTotals: [],
      transactionsFrom: null,
    });
    const { tones, bucketOf } = categoryBuckets(index, "spending", -1);
    expect(tones[bucketOf[9]]).toBe("series1");
    expect(tones[bucketOf[3]]).toBe("series7");
    expect(tones[bucketOf[2]]).toBe("other");
  });
});
