import { toGbp } from "../ledger/to-gbp.ts";
import type { Bar, FxSeries } from "../types.ts";
import { gbpUsdOn } from "./gbp-usd-on.ts";
import { RISK_WINDOWS } from "./risk-windows.ts";
import { sampleCovariance } from "./sample-covariance.ts";

export interface VolatilityHolding {
  bars: readonly Bar[];
  currency: "GBP" | "USD";
  /** A fraction of NAV. */
  weight: number;
}

/**
 * The annual volatility of the portfolio in GBP, in percent, from the
 * covariance of its holdings' daily returns. `calendar` holds the dates on
 * which every market of the holdings traded, oldest first; each return runs
 * from one such date to the next, so a holiday in one market folds into the
 * next common return instead of a false zero. Cash adds no risk.
 */
export function portfolioVolatility({
  holdings,
  calendar,
  fx,
}: {
  holdings: readonly VolatilityHolding[];
  calendar: readonly string[];
  fx: FxSeries;
}): number | null {
  if (holdings.length === 0) return 0;
  let start = "";
  for (const holding of holdings) {
    const first = holding.bars.at(0)?.date;
    if (first === undefined) return null;
    if (first > start) start = first;
  }
  const dates = calendar
    .filter((date) => date >= start)
    .slice(-(RISK_WINDOWS.returnSessions + 1));
  if (dates.length - 1 < RISK_WINDOWS.minReturns) return null;

  const returns: number[][] = [];
  for (const holding of holdings) {
    const prices = gbpPricesOn(holding, dates, fx);
    if (prices === null) return null;
    returns.push(
      prices.slice(1).map((price, index) => price / prices[index] - 1),
    );
  }

  let dailyVariance = 0;
  for (let i = 0; i < holdings.length; i += 1) {
    for (let j = 0; j < holdings.length; j += 1) {
      dailyVariance +=
        holdings[i].weight *
        holdings[j].weight *
        sampleCovariance(returns[i], returns[j]);
    }
  }
  return Math.sqrt(dailyVariance * RISK_WINDOWS.sessionsPerYear) * 100;
}

/**
 * The adjusted close in GBP on each date. A stock with no bar on a date
 * (a halt) keeps its last price.
 */
function gbpPricesOn(
  holding: VolatilityHolding,
  dates: readonly string[],
  fx: FxSeries,
): number[] | null {
  const prices: number[] = [];
  let at = 0;
  for (const date of dates) {
    while (at + 1 < holding.bars.length && holding.bars[at + 1].date <= date) {
      at += 1;
    }
    const gbpUsd = holding.currency === "USD" ? gbpUsdOn(fx, date) : 1;
    if (gbpUsd === null) return null;
    prices.push(toGbp(holding.bars[at].adjClose, holding, gbpUsd));
  }
  return prices;
}
