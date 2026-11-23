import type { Portfolio, ValuedPortfolio, ValuedPosition } from "../types.ts";
import type { InstrumentLookup } from "./instrument-of.ts";
import { roundPennies } from "./round-pennies.ts";
import { toGbp } from "./to-gbp.ts";

export interface PriceOn {
  /** Major units. */
  price: number;
  date: string;
}

export function valueAtPrices(
  portfolio: Portfolio,
  priceOf: (symbol: string) => PriceOn,
  instrumentFor: InstrumentLookup,
  gbpUsd: number,
): ValuedPortfolio {
  const priced = portfolio.positions.map((position) => {
    const { price, date } = priceOf(position.symbol);
    const marketValueGbp = roundPennies(
      toGbp(position.quantity * price, instrumentFor(position.symbol), gbpUsd),
    );
    return { position, price, date, marketValueGbp };
  });
  const navGbp = roundPennies(
    priced.reduce((sum, p) => sum + p.marketValueGbp, portfolio.cashGbp),
  );
  const weightOf = (valueGbp: number) =>
    navGbp === 0 ? 0 : (valueGbp / navGbp) * 100;
  const positions: ValuedPosition[] = priced.map(
    ({ position, price, date, marketValueGbp }) => ({
      ...position,
      price,
      priceDate: date,
      marketValueGbp,
      weightPct: weightOf(marketValueGbp),
      unrealisedPnlGbp: roundPennies(marketValueGbp - position.costGbp),
    }),
  );
  return {
    ...portfolio,
    navGbp,
    cashWeightPct: weightOf(portfolio.cashGbp),
    gbpUsd,
    positions,
  };
}
