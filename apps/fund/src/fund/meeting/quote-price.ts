import { toQuoteUnits } from "../orders/to-major-units.ts";
import type { Instrument } from "../types.ts";
import { roundTo } from "./round-to.ts";

/** A major-unit price as an agent reads it: pence for London, dollars for US. */
export function quotePrice(
  major: number | null | undefined,
  instrument: Pick<Instrument, "quoteScale">,
): number | null {
  if (major === null || major === undefined) return null;
  return roundTo(toQuoteUnits(major, instrument), 2);
}

/** The name of the quote unit of a stock, for the packs. */
export function quoteUnit(
  instrument: Pick<Instrument, "currency" | "quoteScale">,
): string {
  if (instrument.currency === "USD") return "USD";
  return instrument.quoteScale === 100 ? "GBX (pence)" : "GBP";
}
