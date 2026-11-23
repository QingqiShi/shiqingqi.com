import type { FundDb } from "#src/db/types.ts";
import type { Fundamentals } from "../../contracts/fundamentals-schema.ts";
import { dailyBars, fundamentals, instruments } from "../../fund-schema.ts";
import { addWeekdays } from "../../orders/add-weekdays.ts";

/** The last stored session; the test meetings are for the Monday after it. */
export const LAST_SESSION = "2026-11-20";
export const MEETING_DAY = "2026-11-23";
export const GBP_USD = 1.25;

/** Major units. Each stock trades flat at this price for its last 30 sessions. */
export const LAST_CLOSE = { "SHEL.L": 26, AAPL: 200, MSFT: 400 } as const;

const SESSIONS = 260;

const STOCKS = [
  {
    symbol: "SHEL.L",
    name: "Shell",
    exchange: "LSE",
    currency: "GBP",
    quoteScale: 100,
    sector: "Energy",
    index: "FTSE100",
  },
  {
    symbol: "AAPL",
    name: "Apple",
    exchange: "US",
    currency: "USD",
    quoteScale: 1,
    sector: "Technology",
    index: "SP100",
  },
  {
    symbol: "MSFT",
    name: "Microsoft",
    exchange: "US",
    currency: "USD",
    quoteScale: 1,
    sector: "Technology",
    index: "SP100",
  },
] as const;

function fundamentalsOf(marketCapGbp: number): Fundamentals {
  return {
    financialCurrency: "USD",
    marketCapGbp,
    trailingEps: 5,
    forwardEps: 6,
    trailingPe: 20,
    forwardPe: 18,
    pegRatio: null,
    priceToBook: null,
    evToEbitda: null,
    freeCashFlowYield: 0.04,
    dividendYield: 0.01,
    returnOnEquity: 0.2,
    profitMargin: 0.15,
    revenueGrowth: 0.05,
    earningsGrowth: 0.08,
    debtToEquity: 50,
    nextEarningsDate: null,
    exDividendDate: null,
    analystTargetMean: null,
    analystRecommendation: null,
    quarterlyEps: [],
    annual: [],
  };
}

/** Three liquid stocks, both benchmarks and GBPUSD, with a year of bars. */
export async function seedTestMarket(db: FundDb): Promise<void> {
  await db.insert(instruments).values([
    ...STOCKS.map((s) => ({
      ...s,
      kind: "stock" as const,
      industry: s.sector,
    })),
    {
      symbol: "^FTSE",
      kind: "benchmark",
      name: "FTSE 100",
      exchange: "LSE",
      currency: "GBP",
    },
    {
      symbol: "^GSPC",
      kind: "benchmark",
      name: "S&P 500",
      exchange: "US",
      currency: "USD",
    },
    { symbol: "GBPUSD=X", kind: "fx", name: "GBP/USD", currency: "USD" },
  ]);
  const dates: string[] = [LAST_SESSION];
  while (dates.length < SESSIONS) dates.unshift(addWeekdays(dates[0], -1));
  const series: Record<string, number> = {
    ...LAST_CLOSE,
    "^FTSE": 9000,
    "^GSPC": 6000,
    "GBPUSD=X": GBP_USD,
  };
  const rows = Object.entries(series).flatMap(([symbol, base]) =>
    dates.map((date, i) => {
      const close =
        symbol === "GBPUSD=X" || i >= SESSIONS - 30
          ? base
          : base * (1 + 0.03 * Math.sin(i / 7 + base));
      return {
        symbol,
        date,
        open: close,
        high: close * 1.01,
        low: close * 0.99,
        close,
        adjClose: close,
        volume: 5_000_000,
      };
    }),
  );
  await db.insert(dailyBars).values(rows);
  await db.insert(fundamentals).values(
    STOCKS.map((s) => ({
      symbol: s.symbol,
      fetchedOn: LAST_SESSION,
      data: fundamentalsOf(100_000_000_000),
    })),
  );
}
