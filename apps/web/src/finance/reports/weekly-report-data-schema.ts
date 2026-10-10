import { z } from "zod";

/** Bump when the shape of `WeeklyReportData` changes; a stored Report with another version is out of date. */
export const WEEKLY_REPORT_SCHEMA_VERSION = 2;

/** Weeks in the exponential moving average of the net-worth trend. */
export const TREND_AVERAGE_WEEKS = 13;

const day = z.iso.date();
const minor = z.number().int();

const reportAccountSchema = z.object({
  id: z.string(),
  name: z.string(),
  institution: z.string(),
  kind: z.string(),
  currency: z.string(),
  /** The balance at the end of the week in the Account's currency. */
  balanceMinor: minor,
  /** The same balance in the base currency. Accounts add up to their Group's total. */
  baseMinor: minor,
});

const reportGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  totalMinor: minor,
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

/** A Group with the liability Groups named after it, such as 不动产 and 不动产负债: one bar in the per-group chart. */
const groupNetSchema = z.object({
  name: z.string(),
  groupIds: z.array(z.string()),
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
  groupNets: z.array(groupNetSchema),
  propertyNetMinor: minor.nullable(),
  spending: z.object({
    totalMinor: minor,
    averageMinor: minor,
    changeMinor: minor,
    byCategory: z.array(spendingLineSchema),
    byMember: z.array(spendingLineSchema),
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
