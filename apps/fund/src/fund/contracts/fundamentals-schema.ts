import { z } from "zod";

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Earnings and valuation of one stock. A missing number is null, not 0. */
export const fundamentalsSchema = z.object({
  /** The currency of the financial statements; it can differ from the price. */
  financialCurrency: z.string().nullable(),
  marketCapGbp: z.number().nullable(),
  /** Trailing 12-month diluted EPS, in `financialCurrency`. */
  trailingEps: z.number().nullable(),
  forwardEps: z.number().nullable(),
  /**
   * Price over trailing EPS with both in one currency. Null when earnings
   * are zero or negative: a negative PE has no meaning.
   */
  trailingPe: z.number().nullable(),
  forwardPe: z.number().nullable(),
  pegRatio: z.number().nullable(),
  priceToBook: z.number().nullable(),
  evToEbitda: z.number().nullable(),
  /** Free cash flow over market value, as a fraction. */
  freeCashFlowYield: z.number().nullable(),
  dividendYield: z.number().nullable(),
  returnOnEquity: z.number().nullable(),
  profitMargin: z.number().nullable(),
  revenueGrowth: z.number().nullable(),
  earningsGrowth: z.number().nullable(),
  debtToEquity: z.number().nullable(),
  nextEarningsDate: isoDate.nullable(),
  exDividendDate: isoDate.nullable(),
  analystTargetMean: z.number().nullable(),
  analystRecommendation: z.string().nullable(),
  /** Diluted EPS of the last quarters, oldest first. */
  quarterlyEps: z.array(z.object({ period: isoDate, eps: z.number() })),
  /** The last fiscal years, oldest first, in `financialCurrency`. */
  annual: z.array(
    z.object({
      period: isoDate,
      revenue: z.number().nullable(),
      netIncome: z.number().nullable(),
      dilutedEps: z.number().nullable(),
      freeCashFlow: z.number().nullable(),
    }),
  ),
});
export type Fundamentals = z.infer<typeof fundamentalsSchema>;
