import type { Instrument } from "../types.ts";
import { toQuoteUnits } from "./to-major-units.ts";

function decimals(value: number): string {
  return value.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

/**
 * A price in major units, written the way a broker quotes it: `104.35p` for
 * a London stock, `$182.10` for a US one.
 */
export function formatPrice(
  majorPrice: number,
  instrument: Pick<Instrument, "currency" | "quoteScale">,
): string {
  if (instrument.currency === "USD") return `$${decimals(majorPrice)}`;
  if (instrument.quoteScale === 100) {
    return `${decimals(toQuoteUnits(majorPrice, instrument))}p`;
  }
  return `£${decimals(majorPrice)}`;
}

export function formatGbp(amountGbp: number): string {
  return `£${amountGbp.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
