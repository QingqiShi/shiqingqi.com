import type { Instrument } from "../types.ts";

const MINOR_UNITS: Record<string, string | undefined> = {
  GBp: "GBP",
  GBX: "GBP",
};

/**
 * Throws unless `quoteCurrency`, as the provider names it, is the currency
 * and the quote scale of `instrument`: a price in pence read as pounds is
 * off by 100 times.
 */
export function assertQuoteUnits(
  quoteCurrency: string | null,
  instrument: Pick<Instrument, "symbol" | "currency" | "quoteScale">,
): void {
  const minorOf = quoteCurrency ? MINOR_UNITS[quoteCurrency] : undefined;
  const currency = minorOf ?? quoteCurrency;
  const scale = minorOf ? 100 : 1;
  if (currency !== instrument.currency || scale !== instrument.quoteScale) {
    throw new Error(
      `${instrument.symbol} is quoted in ${String(quoteCurrency)}, not ${instrument.currency} with a quote scale of ${String(instrument.quoteScale)}`,
    );
  }
}
