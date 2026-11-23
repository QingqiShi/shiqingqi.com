import type { CashEntry, Dividend, FxSeries, Instrument } from "../types.ts";
import type { LedgerFill } from "./apply-fill.ts";
import { gbpUsdAt } from "./gbp-usd-at.ts";
import { instrumentOf } from "./instrument-of.ts";
import { roundPennies } from "./round-pennies.ts";
import { toGbp } from "./to-gbp.ts";

export type NewDividendEntry = Pick<
  CashEntry,
  "date" | "kind" | "amountGbp" | "symbol" | "dedupeKey" | "note"
>;

export interface DividendEntriesInput {
  fills: readonly LedgerFill[];
  dividends: readonly Dividend[];
  instruments: readonly Instrument[];
  fx: FxSeries;
  /** The `dedupeKey`s of dividends already in `cash_entries`. */
  paidKeys: ReadonlySet<string>;
  /** Dividends with a later ex-date are not due yet. */
  asOf: string;
}

/**
 * The dividend cash entries to insert: the shares held at the close of the
 * day before each ex-date, times the dividend per share, in GBP.
 */
export function dividendEntries({
  fills,
  dividends,
  instruments,
  fx,
  paidKeys,
  asOf,
}: DividendEntriesInput): NewDividendEntry[] {
  const instrumentFor = instrumentOf(instruments);
  const entries: NewDividendEntry[] = [];
  for (const dividend of dividends) {
    const dedupeKey = `${dividend.symbol}:${dividend.exDate}`;
    if (dividend.exDate > asOf || paidKeys.has(dedupeKey)) continue;
    const shares = fills
      .filter(
        (f) => f.symbol === dividend.symbol && f.filledOn < dividend.exDate,
      )
      .reduce((sum, f) => sum + (f.side === "buy" ? 1 : -1) * f.quantity, 0);
    if (shares <= 0) continue;
    const instrument = instrumentFor(dividend.symbol);
    const amountGbp = roundPennies(
      toGbp(
        shares * dividend.amount,
        instrument,
        instrument.currency === "USD" ? gbpUsdAt(fx, dividend.exDate) : 1,
      ),
    );
    if (amountGbp === 0) continue;
    entries.push({
      date: dividend.exDate,
      kind: "dividend",
      amountGbp,
      symbol: dividend.symbol,
      dedupeKey,
      note: `${String(shares)} shares × ${String(dividend.amount)} ${instrument.currency}`,
    });
  }
  return entries;
}
