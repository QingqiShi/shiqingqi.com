import { aggregateAnalytics } from "../analytics/aggregate-analytics.ts";
import { categoryBuckets } from "../analytics/category-buckets.ts";
import { categoryIdOf } from "../analytics/category-id-of.ts";
import { periodBoundaries } from "../analytics/period-boundaries.ts";
import type { AnalyticsIndex } from "../analytics/types.ts";
import { SERIES_TONES, type SeriesTone } from "../charts/series-tone-at.ts";
import { weekdayOfEpochDay } from "../domain/dates/start-of-week.ts";
import { upperBound } from "../domain/upper-bound.ts";
import { addMonthKey, monthDays, type MonthKey } from "./month-bounds.ts";
import { notableRows } from "./notable-rows.ts";

export interface MonthDay {
  epochDay: number;
  dayOfMonth: number;
  /** The signed sum of the day's expenses that are not notable: below 0 is money spent. */
  everyday: number;
  /** Index rows of the day's notable Transactions, largest first. */
  notable: readonly number[];
  /** Index rows of every Transaction of the day, in the order of the index. */
  rows: readonly number[];
}

/** One slice of the spending ring: a Category with its own colour, or every other one. */
export interface MonthCategory {
  /** `"other"` for the slice of every other Category. */
  tone: SeriesTone;
  /** The Category of a named slice, null for no Category or for "other". */
  categoryId: string | null;
  /** Money spent, net of refunds; 0 or more. */
  value: number;
}

interface MonthPayee {
  payeeId: string;
  value: number;
  count: number;
  /** The Category of most of the Payee's spending, for its tile. */
  categoryId: string | null;
  tone: SeriesTone;
}

export interface MonthView {
  month: MonthKey;
  firstDay: number;
  /** Empty cells before day 1 in a week that starts on Monday. */
  leadingBlanks: number;
  days: readonly MonthDay[];
  moneyIn: number;
  moneyOut: number;
  net: number;
  count: number;
  /**
   * Every slice in a fixed order, the all-time largest first, so the ring
   * keeps its order between months. A slice too small to read adds to "other".
   */
  categories: readonly MonthCategory[];
  payees: readonly MonthPayee[];
}

export interface MonthBar {
  month: MonthKey;
  moneyIn: number;
  moneyOut: number;
  net: number;
  hasData: boolean;
}

const TOP_PAYEES = 5;

/** A slice smaller than this share of the month's spending joins "other", so the ring never shows a slice too thin to read. */
const MIN_SHARE = 0.05;

/** Orders index rows by size, largest first. */
export function largestFirst(index: AnalyticsIndex) {
  return (a: number, b: number) =>
    Math.abs(index.amounts[b]) - Math.abs(index.amounts[a]) || a - b;
}

/** Money in and out per month of `[from, to]`, and spending per bucket and, on request, per Payee. */
function totalsOf(
  index: AnalyticsIndex,
  from: string,
  to: string,
  buckets: ReturnType<typeof categoryBuckets>,
  breakdowns = false,
) {
  const boundaries = periodBoundaries(from, to, "month");
  return {
    boundaries,
    totals: aggregateAnalytics(index, {
      from: boundaries[0],
      to: boundaries[boundaries.length - 1] - 1,
      kind: "spending",
      member: -1,
      boundaries,
      bucketOf: buckets.bucketOf,
      bucketCount: buckets.count,
      breakdowns,
    }),
  };
}

function sliceCategories(
  index: AnalyticsIndex,
  buckets: ReturnType<typeof categoryBuckets>,
  byBucket: Float64Array,
): MonthCategory[] {
  const named: MonthCategory[] = [];
  const other: MonthCategory = { tone: "other", categoryId: null, value: 0 };
  for (const tone of SERIES_TONES) {
    const bucket = buckets.tones.indexOf(tone);
    if (bucket < 0) continue;
    named.push({
      tone,
      categoryId: categoryIdOf(index, buckets.categories[bucket]),
      value: Math.max(byBucket[bucket], 0),
    });
  }
  buckets.tones.forEach((tone, bucket) => {
    if (tone === "other") other.value += byBucket[bucket];
  });
  other.value = Math.max(other.value, 0);
  const total = named.reduce((sum, slice) => sum + slice.value, other.value);
  for (const slice of named) {
    if (total > 0 && slice.value / total < MIN_SHARE) {
      other.value += slice.value;
      slice.value = 0;
    }
  }
  return [...named, other];
}

function topPayees(
  index: AnalyticsIndex,
  buckets: ReturnType<typeof categoryBuckets>,
  byPayee: Float64Array,
  start: number,
  stop: number,
): MonthPayee[] {
  const top = new Map<number, { count: number; byBucket: Float64Array }>();
  Array.from(byPayee.keys())
    .filter((payee) => byPayee[payee] > 0)
    .sort((a, b) => byPayee[b] - byPayee[a] || a - b)
    .slice(0, TOP_PAYEES)
    .forEach((payee) => {
      top.set(payee, { count: 0, byBucket: new Float64Array(buckets.count) });
    });
  for (let row = start; row < stop; row++) {
    const payee = top.get(index.payees[row]);
    if (payee === undefined || index.kinds[row] !== 0) continue;
    payee.count++;
    const bucket = buckets.bucketOf[index.categories[row]];
    if (bucket >= 0) payee.byBucket[bucket] -= index.amounts[row];
  }
  return Array.from(top, ([payee, { count, byBucket }]) => {
    let bucket = -1;
    byBucket.forEach((spent, candidate) => {
      if (spent > 0 && (bucket < 0 || spent > byBucket[bucket])) {
        bucket = candidate;
      }
    });
    return {
      payeeId: index.payeeIds[payee],
      value: byPayee[payee],
      count,
      categoryId:
        bucket < 0 ? null : categoryIdOf(index, buckets.categories[bucket]),
      tone: bucket < 0 ? "other" : buckets.tones[bucket],
    };
  });
}

/**
 * Everything the Month screen shows for `month`: money in and out, each
 * day's everyday spending and notable Transactions, spending by Category
 * in the colours of Analytics, and the top Payees.
 */
export function buildMonthView(
  index: AnalyticsIndex,
  month: MonthKey,
): MonthView {
  const { from, to } = monthDays(month);
  const buckets = categoryBuckets(index, "spending", -1);
  const { boundaries, totals } = totalsOf(index, from, to, buckets, true);
  const [first, end] = boundaries;
  const start = upperBound(index.days, first - 1);
  const stop = upperBound(index.days, end - 1);
  const moneyIn = totals.incomeByPeriod[0];
  const moneyOut = totals.spendingByPeriod[0];
  const notable = notableRows(index, start, stop, moneyOut);
  const order = largestFirst(index);

  const days: MonthDay[] = [];
  let row = start;
  for (let epochDay = first; epochDay < end; epochDay++) {
    const rows: number[] = [];
    const named: number[] = [];
    let everyday = 0;
    for (; row < stop && index.days[row] === epochDay; row++) {
      rows.push(row);
      if (notable.has(row)) named.push(row);
      else if (index.kinds[row] === 0) everyday += index.amounts[row];
    }
    days.push({
      epochDay,
      dayOfMonth: epochDay - first + 1,
      everyday,
      notable: named.sort(order),
      rows,
    });
  }

  return {
    month,
    firstDay: first,
    leadingBlanks: weekdayOfEpochDay(first) - 1,
    days,
    moneyIn,
    moneyOut,
    net: moneyIn - moneyOut,
    count: stop - start,
    categories: sliceCategories(index, buckets, totals.byBucket),
    payees: topPayees(
      index,
      buckets,
      totals.byPayee ?? new Float64Array(0),
      start,
      stop,
    ),
  };
}

/** Money in, out and net for the `count` months that end at `last`. */
export function buildMonthBars(
  index: AnalyticsIndex,
  last: MonthKey,
  count: number,
): MonthBar[] {
  const buckets = categoryBuckets(index, "spending", -1);
  const { boundaries, totals } = totalsOf(
    index,
    monthDays(addMonthKey(last, 1 - count)).from,
    monthDays(last).to,
    buckets,
  );
  return Array.from({ length: count }, (_, at) => {
    const moneyIn = totals.incomeByPeriod[at];
    const moneyOut = totals.spendingByPeriod[at];
    return {
      month: addMonthKey(last, at + 1 - count),
      moneyIn,
      moneyOut,
      net: moneyIn - moneyOut,
      hasData:
        upperBound(index.days, boundaries[at + 1] - 1) >
        upperBound(index.days, boundaries[at] - 1),
    };
  });
}

/**
 * The last month of a strip of `count` bars that holds `month`: the
 * current month while `month` is among the latest `count`, so the strip
 * stays put, and else the month that puts `month` in the middle.
 */
export function barWindowEnd(
  month: MonthKey,
  current: MonthKey,
  count: number,
): MonthKey {
  if (addMonthKey(month, count) > current) return current;
  return addMonthKey(month, Math.floor(count / 2));
}
