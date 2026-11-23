import YahooFinance from "yahoo-finance2";
import { z } from "zod";
import type {
  MarketProvider,
  PriceHistory,
  RawFundamentals,
  StatementRow,
} from "./types.ts";

const SUMMARY_MODULES = [
  "calendarEvents",
  "defaultKeyStatistics",
  "earningsTrend",
  "financialData",
  "price",
  "summaryDetail",
] as const;

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

const statementRowsSchema = z.array(
  z.object({
    date: z.union([z.number(), z.date(), z.string()]),
    dilutedEPS: z.number().optional(),
    totalRevenue: z.number().optional(),
    netIncome: z.number().optional(),
    dilutedAverageShares: z.number().optional(),
    freeCashFlow: z.number().optional(),
    EBITDA: z.number().optional(),
    totalDebt: z.number().optional(),
    cashCashEquivalentsAndShortTermInvestments: z.number().optional(),
    cashAndCashEquivalents: z.number().optional(),
    commonStockEquity: z.number().optional(),
  }),
);

function finite(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isoDay(date: number | Date | string): string {
  // Without validation the library gives a statement date in epoch seconds.
  const instant =
    typeof date === "number" ? new Date(date * 1000) : new Date(date);
  return instant.toISOString().slice(0, 10);
}

function toStatementRows(raw: unknown): StatementRow[] {
  return statementRowsSchema
    .parse(raw)
    .map((row): StatementRow => ({
      periodEnd: isoDay(row.date),
      dilutedEps: finite(row.dilutedEPS),
      revenue: finite(row.totalRevenue),
      netIncome: finite(row.netIncome),
      dilutedShares: finite(row.dilutedAverageShares),
      freeCashFlow: finite(row.freeCashFlow),
      ebitda: finite(row.EBITDA),
      totalDebt: finite(row.totalDebt),
      cash: finite(
        row.cashCashEquivalentsAndShortTermInvestments ??
          row.cashAndCashEquivalents,
      ),
      commonStockEquity: finite(row.commonStockEquity),
    }))
    .filter((row) =>
      Object.values(row).some((value) => typeof value === "number"),
    )
    .sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));
}

/** A `MarketProvider` over Yahoo Finance. */
export function yahooMarketProvider(
  yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] }),
): MarketProvider {
  async function statements(
    symbol: string,
    type: "quarterly" | "annual" | "trailing",
    now: Date,
    years: number,
  ) {
    // The library rejects trailing rows (period type `TTM`) when it
    // validates, so this reads them raw and parses them here.
    const raw: unknown = await yf.fundamentalsTimeSeries(
      symbol,
      {
        period1: new Date(now.getTime() - years * YEAR_MS),
        period2: now,
        type,
        module: "all",
      },
      { validateResult: false },
    );
    return toStatementRows(raw);
  }

  return {
    async priceHistory(symbol, { from, to }): Promise<PriceHistory> {
      const chart = await yf.chart(symbol, {
        period1: from,
        period2: to,
        interval: "1d",
        events: "div",
      });
      const { meta } = chart;
      return {
        quoteCurrency: meta.currency,
        timeZone: meta.exchangeTimezoneName,
        regularSession: {
          start: meta.currentTradingPeriod.regular.start.toISOString(),
          end: meta.currentTradingPeriod.regular.end.toISOString(),
        },
        bars: chart.quotes.map((quote) => ({
          time: quote.date.toISOString(),
          open: finite(quote.open),
          high: finite(quote.high),
          low: finite(quote.low),
          close: finite(quote.close),
          adjClose: finite(quote.adjclose),
          volume: finite(quote.volume),
        })),
        dividends: (chart.events?.dividends ?? []).map((dividend) => ({
          time: dividend.date.toISOString(),
          amount: dividend.amount,
        })),
      };
    },

    async fundamentals(symbol, now): Promise<RawFundamentals> {
      const summary = await yf.quoteSummary(symbol, {
        modules: [...SUMMARY_MODULES],
      });
      const quarterly = await statements(symbol, "quarterly", now, 3);
      const annual = await statements(symbol, "annual", now, 5);
      const trailing = await statements(symbol, "trailing", now, 2);
      const { price, financialData, summaryDetail, calendarEvents } = summary;
      const nextYear = summary.earningsTrend?.trend.find(
        (trend) => trend.period === "+1y",
      );
      const recommendation = financialData?.recommendationKey;
      return {
        quoteCurrency: price?.currency ?? null,
        price: finite(price?.regularMarketPrice),
        marketCap: finite(price?.marketCap),
        financialCurrency: financialData?.financialCurrency ?? null,
        // `defaultKeyStatistics.forwardEps` is this estimate converted to the
        // price currency at an old rate, so this takes the source.
        forwardEps: finite(nextYear?.earningsEstimate.avg),
        pegRatio: finite(summary.defaultKeyStatistics?.pegRatio),
        dividendYield: finite(summaryDetail?.dividendYield),
        returnOnEquity: finite(financialData?.returnOnEquity),
        profitMargin: finite(financialData?.profitMargins),
        revenueGrowth: finite(financialData?.revenueGrowth),
        earningsGrowth: finite(financialData?.earningsGrowth),
        debtToEquityPct: finite(financialData?.debtToEquity),
        analystTargetMean: finite(financialData?.targetMeanPrice),
        analystRecommendation:
          recommendation && recommendation !== "none" ? recommendation : null,
        earningsDates: (calendarEvents?.earnings.earningsDate ?? []).map(
          (date) => date.toISOString(),
        ),
        exDividendDate:
          (
            calendarEvents?.exDividendDate ?? summaryDetail?.exDividendDate
          )?.toISOString() ?? null,
        quarterly,
        annual,
        trailing,
      };
    },

    async fxRate(from, to) {
      const quote: unknown = await yf.quote(`${from}${to}=X`);
      const parsed = z
        .object({ regularMarketPrice: z.number().positive() })
        .safeParse(quote);
      if (!parsed.success) throw new Error(`No ${from}/${to} rate`);
      return parsed.data.regularMarketPrice;
    },
  };
}
