import type {
  AnalyticsIndex,
  AnalyticsQuery,
  AnalyticsTotals,
} from "./types.ts";

/** The first position in `days` whose day is `day` or later. */
export function lowerBound(days: Int32Array, day: number): number {
  let low = 0;
  let high = days.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (days[middle] < day) low = middle + 1;
    else high = middle;
  }
  return low;
}

/**
 * Adds up one date range of the index in a single pass over its slice:
 * the total, per bucket (a Category rollup), per period, per bucket and
 * period, income and spending per period, and on request per Payee and
 * per Tag. Spending counts an expense as positive, so a refund lowers its
 * own Category; net counts income minus spending.
 */
export function aggregateAnalytics(
  index: AnalyticsIndex,
  query: AnalyticsQuery,
): AnalyticsTotals {
  const { boundaries, bucketOf, bucketCount, kind, member, keep } = query;
  const periodCount = Math.max(boundaries.length - 1, 0);
  const byBucket = new Float64Array(bucketCount);
  const byBucketPeriod = new Float64Array(bucketCount * periodCount);
  const byPeriod = new Float64Array(periodCount);
  const incomeByPeriod = new Float64Array(periodCount);
  const spendingByPeriod = new Float64Array(periodCount);
  const byPayee = query.breakdowns
    ? new Float64Array(index.payeeIds.length)
    : null;
  const byTag = query.breakdowns ? new Float64Array(index.tagIds.length) : null;
  const {
    days,
    amounts,
    kinds,
    categories,
    payees,
    members,
    counts,
    aggregated,
    tagOffsets,
    tagIndexes,
  } = index;
  const wantsIncome = kind !== "spending";
  const wantsSpending = kind !== "income";
  const keepLow = keep ? keep.low : -Infinity;
  const keepHigh = keep ? keep.high : Infinity;

  let total = 0;
  let count = 0;
  const start = lowerBound(days, query.from);
  const end = lowerBound(days, query.to + 1);
  let period = 0;
  let nextStart = periodCount > 0 ? boundaries[1] : Infinity;

  for (let i = start; i < end; i++) {
    if (member >= 0 && members[i] !== member) continue;
    const day = days[i];
    while (day >= nextStart && period < periodCount - 1) {
      period++;
      nextStart = boundaries[period + 1];
    }
    const inPeriods = periodCount > 0 && day >= boundaries[0];
    const amount = amounts[i];
    const isIncome = kinds[i] === 1;
    if (inPeriods) {
      if (isIncome) incomeByPeriod[period] += amount;
      else spendingByPeriod[period] -= amount;
    }
    if (isIncome ? !wantsIncome : !wantsSpending) continue;
    const bucket = bucketOf[categories[i]];
    if (bucket < 0) continue;
    const value = kind === "spending" ? -amount : amount;
    if (aggregated[i] === 0 && (value < keepLow || value > keepHigh)) continue;
    total += value;
    count += counts[i];
    byBucket[bucket] += value;
    if (inPeriods) {
      byPeriod[period] += value;
      byBucketPeriod[bucket * periodCount + period] += value;
    }
    if (byPayee && payees[i] >= 0) byPayee[payees[i]] += value;
    if (byTag) {
      for (let tag = tagOffsets[i]; tag < tagOffsets[i + 1]; tag++) {
        byTag[tagIndexes[tag]] += value;
      }
    }
  }

  return {
    total,
    count,
    byBucket,
    byBucketPeriod,
    byPeriod,
    incomeByPeriod,
    spendingByPeriod,
    byPayee,
    byTag,
  };
}
