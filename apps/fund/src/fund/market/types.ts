/**
 * Where the market data comes from. Every value is what the provider says,
 * in the provider's units: the refresh converts and checks it. Each value is
 * plain JSON, so a test can replay a recorded answer.
 */
export interface MarketProvider {
  /** Daily bars and dividends from the start of `from` (a `YYYY-MM-DD`) to `to`. */
  priceHistory: (
    symbol: string,
    range: { from: string; to: Date },
  ) => Promise<PriceHistory>;
  fundamentals: (symbol: string, now: Date) => Promise<RawFundamentals>;
  /** Units of `to` for one unit of `from`, now. */
  fxRate: (from: string, to: string) => Promise<number>;
}

export interface PriceHistory {
  /** As the exchange quotes it, such as `GBp` for pence. */
  quoteCurrency: string;
  /** The IANA time zone of the exchange, such as `Europe/London`. */
  timeZone: string;
  /** The regular session of the exchange that is in progress, next or last. */
  regularSession: { start: string; end: string };
  /** Oldest first, in quote units. `time` is an ISO instant. */
  bars: RawBar[];
  /** Cash per share in quote units. `time` is an ISO instant. */
  dividends: { time: string; amount: number }[];
}

export interface RawBar {
  time: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  adjClose: number | null;
  volume: number | null;
}

/** One row of the financial statements, in the financial currency. */
export interface StatementRow {
  /** The last day of the period, `YYYY-MM-DD`. */
  periodEnd: string;
  dilutedEps: number | null;
  revenue: number | null;
  netIncome: number | null;
  /** The diluted average number of shares in the period. */
  dilutedShares: number | null;
  freeCashFlow: number | null;
  ebitda: number | null;
  totalDebt: number | null;
  cash: number | null;
  commonStockEquity: number | null;
}

export interface RawFundamentals {
  /** As the exchange quotes it, such as `GBp`. */
  quoteCurrency: string | null;
  /** The last price, in quote units. */
  price: number | null;
  /** In the major unit of the price currency, also for a stock quoted in pence. */
  marketCap: number | null;
  financialCurrency: string | null;
  /** The consensus EPS of the next fiscal year, in the financial currency. */
  forwardEps: number | null;
  pegRatio: number | null;
  /** Fractions. */
  dividendYield: number | null;
  returnOnEquity: number | null;
  profitMargin: number | null;
  revenueGrowth: number | null;
  earningsGrowth: number | null;
  /** A percentage: 126 is debt of 1.26 times the equity. */
  debtToEquityPct: number | null;
  /** In quote units. */
  analystTargetMean: number | null;
  analystRecommendation: string | null;
  /** ISO instants. */
  earningsDates: string[];
  exDividendDate: string | null;
  /** Each list is oldest first. */
  quarterly: StatementRow[];
  annual: StatementRow[];
  /** Trailing twelve months, at each period end. */
  trailing: StatementRow[];
}
