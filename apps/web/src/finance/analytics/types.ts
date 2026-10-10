/** What an analytics figure adds up: money spent, money earned, or earned minus spent. */
export type AnalyticsKind = "spending" | "income" | "net";

/** The length of one bar. Weeks start on Monday. */
export type Grouping = "day" | "week" | "month" | "year";

/**
 * Every posted expense and income of the Household as typed columns, sorted
 * by day, so a date range is two binary searches and a pass over a slice.
 * Row `i` of each column is one Transaction, or one Category × Member month
 * total for a month before the Replica window.
 */
export interface AnalyticsIndex {
  length: number;
  /** Epoch days, ascending. */
  days: Int32Array;
  /** Signed minor units in the base currency: expense < 0, refund > 0, income > 0. */
  amounts: Float64Array;
  /** 0 = expense, 1 = income. */
  kinds: Uint8Array;
  /** Index into `categoryIds`; `categoryIds.length` = no Category. */
  categories: Int32Array;
  /** Index into `payeeIds`, or -1. */
  payees: Int32Array;
  /** Index into `memberIds`, or -1. */
  members: Int32Array;
  /** How many Transactions a row stands for: 1, or a month total's count. */
  counts: Int32Array;
  /** 1 for a month total, which has no Payee, Tags or Transaction id. */
  aggregated: Uint8Array;
  transactionIds: readonly string[];
  /** The Tags of row `i` are `tagIndexes[tagOffsets[i] … tagOffsets[i + 1]]`. */
  tagOffsets: Int32Array;
  tagIndexes: Int32Array;
  categoryIds: readonly string[];
  /** The parent of each Category as an index, or -1; one more entry for no Category. */
  categoryParents: Int32Array;
  payeeIds: readonly string[];
  memberIds: readonly string[];
  tagIds: readonly string[];
  /** Spending (positive) per Category over all rows, to give each a stable colour. */
  spendingByCategory: Float64Array;
  incomeByCategory: Float64Array;
  /** The first day that has Transactions, not month totals; null when every row is a Transaction. */
  rawFrom: number | null;
  firstDay: number | null;
  lastDay: number | null;
}

/** One pass of `aggregateAnalytics` over `[from, to]`. */
export interface AnalyticsQuery {
  /** Epoch days, inclusive. */
  from: number;
  to: number;
  kind: AnalyticsKind;
  /** A Member index, or -1 for every Member. */
  member: number;
  /** Period starts plus the day after the last period: `periods + 1` epoch days. */
  boundaries: Int32Array;
  /** The bucket of each Category index (and no Category, last), or -1 to leave it out. */
  bucketOf: Int32Array;
  bucketCount: number;
  /** Add up Payees and Tags too. */
  breakdowns?: boolean;
  /** Leave out Transactions whose value is outside `[low, high]`. */
  keep?: { low: number; high: number };
}

export interface AnalyticsTotals {
  /** The sum of every counted value. */
  total: number;
  /** How many Transactions the values come from. */
  count: number;
  byBucket: Float64Array;
  /** Bucket-major: bucket `b`, period `p` is `[b * periods + p]`. */
  byBucketPeriod: Float64Array;
  byPeriod: Float64Array;
  /** Income and spending (both positive) per period for the Member, every Category. */
  incomeByPeriod: Float64Array;
  spendingByPeriod: Float64Array;
  byPayee: Float64Array | null;
  byTag: Float64Array | null;
}
