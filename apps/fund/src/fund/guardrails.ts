/**
 * The owner's rules. Code enforces them on every order; no agent and no risk
 * policy can loosen them.
 */
export const GUARDRAILS = {
  startingCashGbp: 20_000,
  /** Calendar days from the fill date, for each lot, with no exception. */
  minHoldDays: 30,
  /** The weight of one stock right after a buy, as a share of the fund. */
  maxPositionWeightPct: 20,
  maxSectorWeightPct: 40,
  /** A limit this far from the last close is a mistake, such as pence for pounds. */
  maxLimitDistancePct: 15,
  /** An order lives for at most this many sessions. */
  maxOrderSessions: 5,
  /** Smaller orders cost more in fees than they are worth. */
  minOrderGbp: 250,
} as const;

/** Costs of a paper trade, used to estimate the fees of a fill. */
export const TRADING_COSTS = {
  /** UK stamp duty on purchases of London shares. */
  ukStampDutyPct: 0.5,
  /** The broker's currency conversion charge on a USD trade. */
  fxFeePct: 0.15,
} as const;

/** Half FTSE 100 and half S&P 500, in GBP, rebalanced daily. */
export const BENCHMARK = {
  symbols: { LSE: "^FTSE", US: "^GSPC" },
  weights: { LSE: 0.5, US: 0.5 },
} as const;

export const FX_SYMBOL = "GBPUSD=X";
