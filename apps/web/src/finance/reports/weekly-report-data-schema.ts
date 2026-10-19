import { z } from "zod";

/** Bump when a stored Report of the old shape still parses but is out of date. A stored Report that does not parse is out of date without a bump. */
export const WEEKLY_REPORT_SCHEMA_VERSION = 3;

/** Weeks in the exponential moving average of the net-worth trend. */
export const TREND_AVERAGE_WEEKS = 13;

/** Weeks in `spending.history`, the Report's own week included. */
export const SPENDING_HISTORY_WEEKS = 12;

const day = z.iso.date();
const minor = z.number().int();

const reportAccountSchema = z.object({
  id: z.string(),
  name: z.string(),
  institution: z.string(),
  kind: z.string(),
  currency: z.string(),
  /** The Member who owns the Account when the Report is made; null when it has no owner. */
  ownerName: z.string().nullable().default(null),
  /** The balance at the end of the week in the Account's currency. */
  balanceMinor: minor,
  /** The same balance in the base currency. Accounts add up to their Group's total. */
  baseMinor: minor,
  /** The base-currency balance at the end of the week before; 0 when the Account did not count then. Accounts add up to their Group's previous total. */
  previousBaseMinor: minor,
  /** In transit, whose stored name is English, so show it through `isSystem`. */
  isSystem: z.boolean().default(false),
});

const reportGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  totalMinor: minor,
  /** The total at the end of the week before. The changes of all Groups add up to the net-worth change of the week. */
  previousTotalMinor: minor,
  /** The total at each week end of `trend`, oldest first, so the last is `totalMinor`. */
  history: z.array(minor),
  accounts: z.array(reportAccountSchema),
});

const reportSideSchema = z.object({
  totalMinor: minor,
  groups: z.array(reportGroupSchema),
});

const netWorthComparisonSchema = z.object({
  /** The day the net worth is compared with, at its end. */
  day,
  netWorthMinor: minor,
  /** Net worth at the end of the week minus the net worth on `day`. */
  changeMinor: minor,
});

/** An asset Group with the liability Groups named after it, such as 不动产 and 不动产负债, or a liability Group named after none. */
const groupNetSchema = z.object({
  name: z.string(),
  groupIds: z.array(z.string()),
  /** The sum of the Groups' totals. The values of all families add up to the net worth. */
  valueMinor: minor,
});

const spendingLineSchema = z.object({
  /** A top-level Category, a Member or a Payee; null for none. */
  id: z.string().nullable(),
  /** The stored name. A system Category has its English name here, so show it through `isSystem`. */
  name: z.string(),
  /** A system Category, such as Uncategorised. Always false for a Member. */
  isSystem: z.boolean(),
  /** Spent in the week, net of Refunds. Positive is money out. */
  amountMinor: minor,
  /** The average week of the four weeks before. */
  averageMinor: minor,
  changeMinor: minor,
});

const spendingWeekSchema = z.object({
  /** A week end (Sunday). */
  periodEnd: day,
  /** Spent in that week, net of Refunds. */
  totalMinor: minor,
});

const topPayeeSchema = z.object({
  id: z.string(),
  name: z.string(),
  amountMinor: minor,
  count: z.number().int(),
});

const trendPointSchema = z.object({
  /** A week end (Sunday). */
  day,
  netWorthMinor: minor,
  /** The exponential moving average of net worth over `TREND_AVERAGE_WEEKS` weeks. */
  averageMinor: minor,
  /** Property minus the liabilities named after it; null when there is no property Account. */
  propertyNetMinor: minor.nullable(),
});

/** The stored content of one weekly Report (`reports.data`). */
export const weeklyReportDataSchema = z.object({
  schemaVersion: z.literal(WEEKLY_REPORT_SCHEMA_VERSION),
  /** Monday of the week. */
  periodStart: day,
  /** Sunday of the week; balances are at the end of this day. */
  periodEnd: day,
  baseCurrency: z.string(),
  balanceSheet: z.object({
    assets: reportSideSchema,
    liabilities: reportSideSchema,
    netWorthMinor: minor,
  }),
  comparisons: z.object({
    previousWeek: netWorthComparisonSchema,
    fourWeeksAgo: netWorthComparisonSchema,
    /** The end of 31 December before the week. */
    yearStart: netWorthComparisonSchema,
  }),
  /** One family per asset Group in balance-sheet order, then the liability Groups named after no asset Group. */
  groupNets: z.array(groupNetSchema),
  propertyNetMinor: minor.nullable(),
  spending: z.object({
    totalMinor: minor,
    averageMinor: minor,
    changeMinor: minor,
    byCategory: z.array(spendingLineSchema),
    byMember: z.array(spendingLineSchema),
    /** The spending of each week up to this one, oldest first; at most `SPENDING_HISTORY_WEEKS`, none before the first balance. */
    history: z.array(spendingWeekSchema),
  }),
  incomeMinor: minor,
  topPayees: z.array(topPayeeSchema),
  /** Posted Transactions dated in the week. */
  transactionCount: z.number().int(),
  /** Transactions dated in the week that still need Review. */
  reviewCount: z.number().int(),
  /** One point per week end from the first balance to `periodEnd`. */
  trend: z.array(trendPointSchema),
});

export type WeeklyReportData = z.infer<typeof weeklyReportDataSchema>;
export type ReportSide = z.infer<typeof reportSideSchema>;
export type ReportGroup = z.infer<typeof reportGroupSchema>;
export type SpendingLine = z.infer<typeof spendingLineSchema>;
export type TopPayee = z.infer<typeof topPayeeSchema>;
export type TrendPoint = z.infer<typeof trendPointSchema>;
export type NetWorthComparison = z.infer<typeof netWorthComparisonSchema>;
