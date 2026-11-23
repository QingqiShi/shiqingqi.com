import type { Bar } from "../types.ts";
import { RISK_WINDOWS } from "./risk-windows.ts";
import { sampleCovariance } from "./sample-covariance.ts";

/**
 * The beta of a stock against its own market's index, from the daily
 * returns of the last year of sessions that both have. Null when the
 * sample is too small or the index does not move.
 */
export function stockBeta(
  stockBars: readonly Bar[],
  indexBars: readonly Bar[],
): number | null {
  const indexByDate = new Map(indexBars.map((bar) => [bar.date, bar.adjClose]));
  const common = stockBars
    .flatMap((bar) => {
      const index = indexByDate.get(bar.date);
      return index === undefined ? [] : [{ stock: bar.adjClose, index }];
    })
    .slice(-(RISK_WINDOWS.returnSessions + 1));
  if (common.length - 1 < RISK_WINDOWS.minReturns) return null;
  const stockReturns: number[] = [];
  const indexReturns: number[] = [];
  for (let at = 1; at < common.length; at += 1) {
    const before = common[at - 1];
    const after = common[at];
    stockReturns.push(after.stock / before.stock - 1);
    indexReturns.push(after.index / before.index - 1);
  }
  const indexVariance = sampleCovariance(indexReturns, indexReturns);
  if (indexVariance === 0) return null;
  return sampleCovariance(stockReturns, indexReturns) / indexVariance;
}
