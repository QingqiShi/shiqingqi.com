import type {
  cashEntries,
  dailyBars,
  dividends,
  fills,
  instruments,
  journalEntries,
  orders,
  runs,
  runSteps,
} from "./fund-schema.ts";

export type Instrument = typeof instruments.$inferSelect;
export type Bar = Omit<typeof dailyBars.$inferSelect, "symbol">;
export type Dividend = typeof dividends.$inferSelect;
export type CashEntry = typeof cashEntries.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Fill = typeof fills.$inferSelect;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type Run = typeof runs.$inferSelect;
export type RunStep = typeof runSteps.$inferSelect;

/** Bars of each symbol, oldest first. */
export type BarsBySymbol = ReadonlyMap<string, readonly Bar[]>;

/** USD for one GBP on each date, oldest first. */
export type FxSeries = readonly { date: string; gbpUsd: number }[];

/** Shares from one buy fill that the fund still owns. */
export interface Lot {
  fillId: string;
  openedOn: string;
  /** The first date the lot may be sold: `openedOn` plus the minimum hold. */
  unlockOn: string;
  quantity: number;
  /** What one share cost in GBP, fees included. */
  costGbpPerShare: number;
}

export interface Position {
  symbol: string;
  quantity: number;
  /** Shares in lots whose lock has ended at the date of the portfolio. */
  unlockedQuantity: number;
  costGbp: number;
  /** Oldest first. */
  lots: Lot[];
}

/** The fund on one date, from its fills and cash entries alone. */
export interface Portfolio {
  asOf: string;
  cashGbp: number;
  realisedPnlGbp: number;
  dividendsGbp: number;
  positions: Position[];
}

export interface ValuedPosition extends Position {
  /** The last close before the date of the portfolio, in major units. */
  price: number;
  priceDate: string;
  marketValueGbp: number;
  weightPct: number;
  unrealisedPnlGbp: number;
}

export interface ValuedPortfolio extends Omit<Portfolio, "positions"> {
  navGbp: number;
  cashWeightPct: number;
  /** USD for one GBP used for the valuation. */
  gbpUsd: number;
  positions: ValuedPosition[];
}

/** One stock in the rule screen. A percentile is 0 to 100; higher is better. */
export interface ScreenRow {
  symbol: string;
  sector: string;
  composite: number;
  percentiles: {
    value: number;
    quality: number;
    momentum: number;
    growth: number;
    lowVolatility: number;
  };
  /** The raw numbers behind the percentiles, for people and agents to read. */
  metrics: {
    lastClose: number;
    return12m1mPct: number | null;
    return1mPct: number | null;
    vs200dmaPct: number | null;
    volatility1yPct: number | null;
    trailingPe: number | null;
    forwardPe: number | null;
    freeCashFlowYieldPct: number | null;
    returnOnEquityPct: number | null;
    profitMarginPct: number | null;
    revenueGrowthPct: number | null;
    earningsGrowthPct: number | null;
    marketCapGbp: number | null;
    nextEarningsDate: string | null;
  };
}
