import { applyFill, emptyLedger, positionsOf } from "../ledger/apply-fill.ts";
import { instrumentOf } from "../ledger/instrument-of.ts";
import { valueAtPrices } from "../ledger/value-at-prices.ts";
import type { Instrument, ValuedPortfolio } from "../types.ts";
import type { PlannedOrder } from "./types.ts";

export interface ProFormaInput {
  instruments: readonly Instrument[];
  /** USD for one GBP. */
  gbpUsd: number;
}

/**
 * The fund as if every planned order filled at its limit on the day it is
 * placed. Held stocks keep their last close; a new stock is priced at its
 * limit.
 */
export function proFormaPortfolio(
  valued: ValuedPortfolio,
  planned: readonly PlannedOrder[],
  { instruments, gbpUsd }: ProFormaInput,
): ValuedPortfolio {
  const instrumentFor = instrumentOf(instruments);
  const ledger = emptyLedger(valued.cashGbp, valued.realisedPnlGbp);
  const prices = new Map<string, { price: number; date: string }>();
  for (const position of valued.positions) {
    ledger.lots.set(
      position.symbol,
      position.lots.map((lot) => ({ ...lot })),
    );
    prices.set(position.symbol, {
      price: position.price,
      date: position.priceDate,
    });
  }

  planned.forEach((order, index) => {
    applyFill(ledger, {
      id: `planned-${String(index)}`,
      symbol: order.symbol,
      side: order.side,
      quantity: order.quantity,
      price: order.limitPrice,
      gbpUsd: instrumentFor(order.symbol).currency === "USD" ? gbpUsd : 1,
      feesGbp: order.estimatedFeesGbp,
      filledOn: order.placedFor,
    });
    if (!prices.has(order.symbol)) {
      prices.set(order.symbol, {
        price: order.limitPrice,
        date: order.placedFor,
      });
    }
  });

  return valueAtPrices(
    {
      asOf: valued.asOf,
      cashGbp: ledger.cashGbp,
      realisedPnlGbp: ledger.realisedPnlGbp,
      dividendsGbp: valued.dividendsGbp,
      positions: positionsOf(ledger, valued.asOf),
    },
    (symbol) => {
      const price = prices.get(symbol);
      if (!price) throw new Error(`No price for ${symbol}.`);
      return price;
    },
    instrumentFor,
    gbpUsd,
  );
}
