import type {
  BarsBySymbol,
  Instrument,
  Portfolio,
  ValuedPortfolio,
} from "../types.ts";
import { instrumentOf } from "./instrument-of.ts";
import { valueAtPrices } from "./value-at-prices.ts";

export interface ValuePortfolioInput {
  instruments: readonly Instrument[];
  /** Cut by the caller to the sessions before the date of the portfolio. */
  bars: BarsBySymbol;
  /** USD for one GBP. */
  gbpUsd: number;
}

export function valuePortfolio(
  portfolio: Portfolio,
  { instruments, bars, gbpUsd }: ValuePortfolioInput,
): ValuedPortfolio {
  return valueAtPrices(
    portfolio,
    (symbol) => {
      const last = bars.get(symbol)?.at(-1);
      if (!last) throw new Error(`No close to value ${symbol}.`);
      return { price: last.close, date: last.date };
    },
    instrumentOf(instruments),
    gbpUsd,
  );
}
