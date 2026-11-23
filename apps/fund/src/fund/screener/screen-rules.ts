/**
 * The rules of the stock screen, as data: the code reads every threshold,
 * window and score input from here, and a page shows them to the owner.
 */
export const SCREEN_RULES = {
  eligibility: {
    minHistorySessions: 200,
    liquiditySessions: 20,
    minMedianTradedValueGbp: 1_000_000,
    minMarketCapGbp: 2_000_000_000,
  },
  windows: {
    momentumSessions: 252,
    /** About 1 month: the newest month is left out of the 12-month return. */
    momentumSkipSessions: 21,
    movingAverageSessions: 200,
    volatilitySessions: 252,
    sessionsPerYear: 252,
  },
  /** Each score is the mean of the percentiles of the inputs a stock has. */
  scores: {
    value: [
      { input: "earningsYield", better: "higher" },
      { input: "forwardEarningsYield", better: "higher" },
      { input: "freeCashFlowYield", better: "higher" },
    ],
    quality: [
      { input: "returnOnEquity", better: "higher" },
      { input: "profitMargin", better: "higher" },
      { input: "debtToEquity", better: "lower" },
    ],
    momentum: [
      { input: "return12m1m", better: "higher" },
      { input: "vs200dma", better: "higher" },
    ],
    growth: [
      { input: "revenueGrowth", better: "higher" },
      { input: "earningsGrowth", better: "higher" },
    ],
    lowVolatility: [{ input: "volatility1y", better: "lower" }],
  },
  /** The score of a stock that has none of the inputs of that score. */
  neutralScore: 50,
  /** The best composites among the stocks the fund does not hold. */
  shortlist: {
    defaultSize: 8,
    maxPerSector: 2,
  },
  unknownSector: "Unknown",
} as const;

export type ScoreName = keyof typeof SCREEN_RULES.scores;
export type ScoreInput =
  (typeof SCREEN_RULES.scores)[ScoreName][number]["input"];
