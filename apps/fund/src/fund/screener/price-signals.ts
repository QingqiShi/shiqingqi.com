import type { Bar } from "../types.ts";
import { median } from "./median.ts";
import { SCREEN_RULES } from "./screen-rules.ts";

/** Fractions, not percent. A signal is null when the history is too short. */
export interface PriceSignals {
  sessions: number;
  lastClose: number | null;
  return12m1m: number | null;
  return1m: number | null;
  vs200dma: number | null;
  volatility1y: number | null;
  /** In the currency of the stock. */
  medianTradedValue: number | null;
}

export function priceSignals(bars: readonly Bar[]): PriceSignals {
  const { windows, eligibility } = SCREEN_RULES;
  const adj = bars.map((bar) => bar.adjClose);
  const last = adj.length - 1;
  const adjAgo = (sessions: number) =>
    last - sessions >= 0 ? adj[last - sessions] : null;

  const skipStart = adjAgo(windows.momentumSkipSessions);
  const yearStart = adjAgo(windows.momentumSessions);
  const return12m1m =
    skipStart !== null && yearStart !== null && yearStart > 0
      ? skipStart / yearStart - 1
      : null;
  const return1m =
    skipStart !== null && skipStart > 0 ? adj[last] / skipStart - 1 : null;

  const averageWindow = adj.slice(-windows.movingAverageSessions);
  const vs200dma =
    averageWindow.length === windows.movingAverageSessions
      ? adj[last] / mean(averageWindow) - 1
      : null;

  const volatilityWindow = adj.slice(-(windows.volatilitySessions + 1));
  const returns = volatilityWindow
    .slice(1)
    .map((value, index) => value / volatilityWindow[index] - 1);
  const volatility1y =
    returns.length >= 2
      ? standardDeviation(returns) * Math.sqrt(windows.sessionsPerYear)
      : null;

  const tradedValues = bars
    .slice(-eligibility.liquiditySessions)
    .map((bar) => bar.close * bar.volume);

  return {
    sessions: bars.length,
    lastClose: bars.at(-1)?.close ?? null,
    return12m1m,
    return1m,
    vs200dma,
    volatility1y,
    medianTradedValue: median(tradedValues),
  };
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: readonly number[]): number {
  const average = mean(values);
  const squares = values.reduce(
    (sum, value) => sum + (value - average) ** 2,
    0,
  );
  return Math.sqrt(squares / (values.length - 1));
}
