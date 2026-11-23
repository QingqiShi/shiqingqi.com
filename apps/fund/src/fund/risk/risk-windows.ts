export const RISK_WINDOWS = {
  returnSessions: 252,
  /** With fewer returns than this, beta and volatility are not measured. */
  minReturns: 60,
  sessionsPerYear: 252,
} as const;
