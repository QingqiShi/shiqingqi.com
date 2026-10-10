import type { SeriesTone } from "../charts/series-tone-at.ts";
import { fromEpochDay, toEpochDay } from "../domain/dates/to-epoch-day.ts";
import { aggregateAnalytics, lowerBound } from "./aggregate-analytics.ts";
import { categoryBuckets } from "./category-buckets.ts";
import { outlierFences } from "./outlier-fences.ts";
import { partialPeriods } from "./partial-periods.ts";
import { periodBoundaries } from "./period-boundaries.ts";
import {
  defaultGrouping,
  resolveAnalyticsRange,
  type AnalyticsRange,
  type ResolvedRange,
} from "./resolve-analytics-range.ts";
import type { AnalyticsIndex, AnalyticsKind, Grouping } from "./types.ts";

type TrendDimension = "date" | "transaction";

/** What the Analytics screen shows; the URL carries it. */
export interface AnalyticsState {
  range: AnalyticsRange;
  /** The custom range's days. */
  from: string | null;
  to: string | null;
  /** Null picks the range's default. */
  grouping: Grouping | null;
  /** A Member id, or null for everyone. */
  member: string | null;
  kind: AnalyticsKind;
  /** The picked Category: its trend shows, and a parent opens to its children. */
  category: string | null;
  dimension: TrendDimension;
  excludeOutliers: boolean;
}

export const DEFAULT_ANALYTICS_STATE: AnalyticsState = {
  range: "thisMonth",
  from: null,
  to: null,
  grouping: null,
  member: null,
  kind: "spending",
  category: null,
  dimension: "date",
  excludeOutliers: false,
};

export interface BreakdownRow {
  bucket: number;
  /** The Category id, or null for no Category. */
  categoryId: string | null;
  /** Transactions on the opened parent itself, not on a child. */
  direct: boolean;
  /** True when the Category has children to open. */
  hasChildren: boolean;
  value: number;
  previous: number | null;
  /** Of the breakdown's total, 0–1. */
  share: number;
  tone: SeriesTone;
}

interface BreakdownSeries {
  key: string;
  /** Every Category the series adds up; "Other" holds several. */
  categoryIds: readonly string[];
  /** Null for a named Category series; "other" or "none" otherwise. */
  group: "other" | "none" | null;
  tone: SeriesTone;
  values: Float64Array;
}

interface TrendStats {
  max: number;
  min: number;
  average: number;
  /** How many bars the figures come from: periods or Transactions with a value. */
  count: number;
  /** True when a period the range cuts short has a value and the figures leave it out. */
  partialLeftOut: boolean;
}

export interface CategoryTrend {
  categoryId: string;
  dimension: TrendDimension;
  /** One value per period, or per Transaction in date order. */
  values: Float64Array;
  /** Per Transaction, its row in the index; empty for the date dimension. */
  rows: Int32Array;
  stats: TrendStats | null;
  /** Transactions the IQR rule marks as outliers, left out or not. */
  outlierCount: number;
  excluded: boolean;
}

export interface AnalyticsView {
  range: ResolvedRange;
  grouping: Grouping;
  /** True when part of the range is older than the Replica window: month totals only. */
  beyondWindow: boolean;
  /** The first day with Transactions, when older days come from month totals. */
  rawFrom: string | null;
  /** Each period's first epoch day, then the day after the last period. */
  boundaries: Int32Array;
  /** 1 for a period the range cuts short of its calendar week, month or year. */
  partial: Uint8Array;
  /** True when the last period is cut short at today: it is still running. */
  lastPeriodOngoing: boolean;
  total: number;
  /** The average period, from the whole periods when there are any. */
  periodAverage: number;
  previousTotal: number | null;
  count: number;
  incomeByPeriod: Float64Array;
  spendingByPeriod: Float64Array;
  /** The opened parent Category, root first; empty at the top level. */
  path: readonly string[];
  rows: readonly BreakdownRow[];
  series: readonly BreakdownSeries[];
  trend: CategoryTrend | null;
  payees: readonly { payeeId: string; value: number }[];
  tags: readonly { tagId: string; value: number }[];
}

const TOP_PAYEES = 10;

function rank(value: number, kind: AnalyticsKind) {
  return kind === "net" ? Math.abs(value) : value;
}

function hasChildrenSet(parents: Int32Array) {
  const set = new Set<number>();
  for (const parent of parents) if (parent >= 0) set.add(parent);
  return set;
}

function pathOf(parents: Int32Array, category: number) {
  const path: number[] = [];
  let current = category;
  for (let depth = 0; depth < 32 && current >= 0; depth++) {
    path.unshift(current);
    current = parents[current];
  }
  return path;
}

function statsOf(
  values: Float64Array,
  partial?: Uint8Array,
): TrendStats | null {
  let max = -Infinity;
  let min = Infinity;
  let sum = 0;
  let count = 0;
  let partialLeftOut = false;
  for (let at = 0; at < values.length; at++) {
    const value = values[at];
    if (value === 0) continue;
    if (partial?.[at]) {
      partialLeftOut = true;
      continue;
    }
    if (value > max) max = value;
    if (value < min) min = value;
    sum += value;
    count++;
  }
  if (count === 0) return partialLeftOut ? statsOf(values) : null;
  return { max, min, average: sum / count, count, partialLeftOut };
}

function periodAverageOf(byPeriod: Float64Array, partial: Uint8Array) {
  let sum = 0;
  let whole = 0;
  let total = 0;
  for (let at = 0; at < byPeriod.length; at++) {
    total += byPeriod[at];
    if (partial[at]) continue;
    sum += byPeriod[at];
    whole++;
  }
  if (whole > 0) return sum / whole;
  return byPeriod.length > 0 ? total / byPeriod.length : 0;
}

/**
 * Works out everything the Analytics screen shows for one state, from the
 * index alone: a few passes over the range's slice, so a new range costs
 * well under a frame even at 60k Transactions.
 */
export function computeAnalyticsView(
  index: AnalyticsIndex,
  state: AnalyticsState,
  today: string,
): AnalyticsView {
  const range = resolveAnalyticsRange(state.range, today, {
    firstDay: index.firstDay === null ? null : fromEpochDay(index.firstDay),
    custom: { from: state.from, to: state.to },
  });
  const from = toEpochDay(range.from);
  const to = toEpochDay(range.to);
  const beyondWindow = index.rawFrom !== null && from < index.rawFrom;
  let grouping = state.grouping ?? defaultGrouping(range.from, range.to);
  if (beyondWindow && (grouping === "day" || grouping === "week")) {
    grouping = "month";
  }
  const boundaries = periodBoundaries(range.from, range.to, grouping);
  const periodCount = boundaries.length - 1;
  const partial = partialPeriods(boundaries, grouping);
  const found =
    state.member === null ? -1 : index.memberIds.indexOf(state.member);
  const memberIndex =
    state.member === null ? -1 : found >= 0 ? found : index.memberIds.length;

  const parents = index.categoryParents;
  const withChildren = hasChildrenSet(parents);
  const selected =
    state.category === null ? -1 : index.categoryIds.indexOf(state.category);
  const opened =
    selected < 0
      ? -1
      : withChildren.has(selected)
        ? selected
        : parents[selected];
  const buckets = categoryBuckets(index, state.kind, opened);

  const current = aggregateAnalytics(index, {
    from,
    to,
    kind: state.kind,
    member: memberIndex,
    boundaries,
    bucketOf: buckets.bucketOf,
    bucketCount: buckets.count,
    breakdowns: true,
  });
  const previous = range.previous
    ? aggregateAnalytics(index, {
        from: toEpochDay(range.previous.from),
        to: toEpochDay(range.previous.to),
        kind: state.kind,
        member: memberIndex,
        boundaries: new Int32Array(0),
        bucketOf: buckets.bucketOf,
        bucketCount: buckets.count,
      })
    : null;

  const none = parents.length - 1;
  const idOf = (category: number) =>
    category === none ? null : index.categoryIds[category];
  const breakdownTotal = current.total;
  const rows: BreakdownRow[] = [];
  for (let bucket = 0; bucket < buckets.count; bucket++) {
    const value = current.byBucket[bucket];
    const before = previous ? previous.byBucket[bucket] : null;
    if (value === 0 && !before) continue;
    const category = buckets.categories[bucket];
    rows.push({
      bucket,
      categoryId: idOf(category),
      direct: bucket === buckets.directBucket,
      hasChildren:
        bucket !== buckets.directBucket && withChildren.has(category),
      value,
      previous: before,
      share: breakdownTotal === 0 ? 0 : value / breakdownTotal,
      tone: buckets.tones[bucket],
    });
  }
  rows.sort(
    (a, b) =>
      rank(b.value, state.kind) - rank(a.value, state.kind) ||
      a.bucket - b.bucket,
  );

  const series: BreakdownSeries[] = [];
  const other = new Float64Array(periodCount);
  const otherIds: string[] = [];
  let otherUsed = false;
  const toneOrder = (tone: SeriesTone) =>
    tone === "other" ? Infinity : Number(tone.slice(6));
  const named = rows
    .filter((row) => row.value !== 0)
    .sort(
      (a, b) => toneOrder(a.tone) - toneOrder(b.tone) || a.bucket - b.bucket,
    );
  for (const row of named) {
    const values = current.byBucketPeriod.subarray(
      row.bucket * periodCount,
      (row.bucket + 1) * periodCount,
    );
    if (row.tone === "other") {
      otherUsed = true;
      if (row.categoryId !== null) otherIds.push(row.categoryId);
      for (let period = 0; period < periodCount; period++) {
        other[period] += values[period];
      }
    } else {
      series.push({
        key: row.categoryId ?? (row.direct ? "direct" : "none"),
        categoryIds: row.categoryId === null ? [] : [row.categoryId],
        group: row.categoryId === null ? "none" : null,
        tone: row.tone,
        values,
      });
    }
  }
  if (otherUsed) {
    series.push({
      key: "other",
      categoryIds: otherIds,
      group: "other",
      tone: "other",
      values: other,
    });
  }

  const payees = current.byPayee
    ? Array.from(current.byPayee, (value, payee) => ({ payee, value }))
        .filter(({ value }) => rank(value, state.kind) > 0)
        .sort(
          (a, b) =>
            rank(b.value, state.kind) - rank(a.value, state.kind) ||
            a.payee - b.payee,
        )
        .slice(0, TOP_PAYEES)
        .map(({ payee, value }) => ({ payeeId: index.payeeIds[payee], value }))
    : [];
  const tags = current.byTag
    ? Array.from(current.byTag, (value, tag) => ({ tag, value }))
        .filter(({ value }) => value !== 0)
        .sort(
          (a, b) =>
            rank(b.value, state.kind) - rank(a.value, state.kind) ||
            a.tag - b.tag,
        )
        .map(({ tag, value }) => ({ tagId: index.tagIds[tag], value }))
    : [];

  const trend =
    selected < 0
      ? null
      : categoryTrend(index, {
          category: selected,
          from,
          to,
          kind: state.kind,
          member: memberIndex,
          boundaries,
          partial,
          dimension: state.dimension,
          excludeOutliers: state.excludeOutliers,
        });

  return {
    range,
    grouping,
    beyondWindow,
    rawFrom: index.rawFrom === null ? null : fromEpochDay(index.rawFrom),
    boundaries,
    partial,
    lastPeriodOngoing:
      periodCount > 0 && partial[periodCount - 1] === 1 && range.to === today,
    total: current.total,
    periodAverage: periodAverageOf(current.byPeriod, partial),
    previousTotal: previous ? previous.total : null,
    count: current.count,
    incomeByPeriod: current.incomeByPeriod,
    spendingByPeriod: current.spendingByPeriod,
    path:
      opened < 0
        ? []
        : pathOf(parents, opened).map((c) => index.categoryIds[c]),
    rows,
    series,
    trend,
    payees,
    tags,
  };
}

function categoryTrend(
  index: AnalyticsIndex,
  options: {
    category: number;
    from: number;
    to: number;
    kind: AnalyticsKind;
    member: number;
    boundaries: Int32Array;
    partial: Uint8Array;
    dimension: TrendDimension;
    excludeOutliers: boolean;
  },
): CategoryTrend {
  const parents = index.categoryParents;
  const bucketOf = new Int32Array(parents.length).fill(-1);
  for (let category = 0; category < parents.length; category++) {
    let current = category;
    for (let depth = 0; depth < 32 && current >= 0; depth++) {
      if (current === options.category) {
        bucketOf[category] = 0;
        break;
      }
      current = parents[current];
    }
  }

  const { days, amounts, kinds, categories, members, aggregated } = index;
  const start = lowerBound(days, options.from);
  const end = lowerBound(days, options.to + 1);
  const values = new Float64Array(end - start);
  const rows = new Int32Array(end - start);
  let found = 0;
  for (let i = start; i < end; i++) {
    if (aggregated[i] === 1 || bucketOf[categories[i]] < 0) continue;
    if (options.member !== -1 && members[i] !== options.member) continue;
    const isIncome = kinds[i] === 1;
    if (options.kind === "spending" && isIncome) continue;
    if (options.kind === "income" && !isIncome) continue;
    values[found] = options.kind === "spending" ? -amounts[i] : amounts[i];
    rows[found] = i;
    found++;
  }
  const fences = outlierFences(values.subarray(0, found));
  let outlierCount = 0;
  if (fences) {
    for (let at = 0; at < found; at++) {
      if (values[at] < fences.low || values[at] > fences.high) outlierCount++;
    }
  }
  const keep = options.excludeOutliers && fences ? fences : undefined;
  const categoryId = index.categoryIds[options.category];

  if (options.dimension === "transaction") {
    let kept = 0;
    for (let at = 0; at < found; at++) {
      if (keep && (values[at] < keep.low || values[at] > keep.high)) continue;
      values[kept] = values[at];
      rows[kept] = rows[at];
      kept++;
    }
    const trendValues = values.subarray(0, kept);
    return {
      categoryId,
      dimension: "transaction",
      values: trendValues,
      rows: rows.subarray(0, kept),
      stats: statsOf(trendValues),
      outlierCount,
      excluded: keep !== undefined,
    };
  }

  const totals = aggregateAnalytics(index, {
    from: options.from,
    to: options.to,
    kind: options.kind,
    member: options.member,
    boundaries: options.boundaries,
    bucketOf,
    bucketCount: 1,
    keep,
  });
  return {
    categoryId,
    dimension: "date",
    values: totals.byPeriod,
    rows: new Int32Array(0),
    stats: statsOf(totals.byPeriod, options.partial),
    outlierCount,
    excluded: keep !== undefined,
  };
}
