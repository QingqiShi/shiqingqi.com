import { BENCHMARK } from "../guardrails.ts";
import type { BarsBySymbol, FxSeries, Instrument } from "../types.ts";
import type { LedgerFill } from "./apply-fill.ts";
import { derivePortfolio, type LedgerCashEntry } from "./derive-portfolio.ts";
import { gbpUsdAt } from "./gbp-usd-at.ts";
import { instrumentOf } from "./instrument-of.ts";
import { lastOnOrBefore } from "./last-on-or-before.ts";
import { roundPennies } from "./round-pennies.ts";
import { valueAtPrices } from "./value-at-prices.ts";

export interface NavSeriesInput {
  fills: readonly LedgerFill[];
  cashEntries: readonly LedgerCashEntry[];
  instruments: readonly Instrument[];
  /** The held stocks and the two benchmark indices, oldest first. */
  bars: BarsBySymbol;
  fx: FxSeries;
  from: string;
  to: string;
}

export interface NavPoint {
  date: string;
  navGbp: number;
  cashGbp: number;
  /** Half FTSE 100, half S&P 500 in GBP, equal to `navGbp` on the first date. */
  benchmarkGbp: number;
}

/**
 * The NAV at the close of each session from `from` through `to`. A session is
 * a date with a bar of either benchmark index.
 */
export function navSeries({
  fills,
  cashEntries,
  instruments,
  bars,
  fx,
  from,
  to,
}: NavSeriesInput): NavPoint[] {
  const ukBars = bars.get(BENCHMARK.symbols.LSE) ?? [];
  const usBars = bars.get(BENCHMARK.symbols.US) ?? [];
  const dates = [
    ...new Set(
      [...ukBars, ...usBars]
        .map((bar) => bar.date)
        .filter((date) => date >= from && date <= to),
    ),
  ].sort();
  const instrumentFor = instrumentOf(instruments);

  const closeOn = (symbol: string, date: string) => {
    const bar = lastOnOrBefore(bars.get(symbol) ?? [], date);
    if (!bar) throw new Error(`No close of ${symbol} on or before ${date}.`);
    return { price: bar.close, date: bar.date };
  };
  const indexLevels = (date: string) => ({
    uk: closeOn(BENCHMARK.symbols.LSE, date).price,
    us: closeOn(BENCHMARK.symbols.US, date).price / gbpUsdAt(fx, date),
  });

  const points: NavPoint[] = [];
  let benchmark = 0;
  let previous: { uk: number; us: number } | undefined;
  for (const date of dates) {
    const gbpUsd = gbpUsdAt(fx, date);
    const valued = valueAtPrices(
      derivePortfolio({ fills, cashEntries, asOf: date }),
      (symbol) => closeOn(symbol, date),
      instrumentFor,
      gbpUsd,
    );
    const levels = indexLevels(date);
    if (previous) {
      const dailyReturn =
        BENCHMARK.weights.LSE * (levels.uk / previous.uk - 1) +
        BENCHMARK.weights.US * (levels.us / previous.us - 1);
      benchmark *= 1 + dailyReturn;
    } else {
      benchmark = valued.navGbp;
    }
    previous = levels;
    points.push({
      date,
      navGbp: valued.navGbp,
      cashGbp: valued.cashGbp,
      benchmarkGbp: roundPennies(benchmark),
    });
  }
  return points;
}
