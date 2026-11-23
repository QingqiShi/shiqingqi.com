import type { Instrument } from "../types.ts";

export function toMajorUnits(
  quotePrice: number,
  instrument: Pick<Instrument, "quoteScale">,
): number {
  return Math.round((quotePrice / instrument.quoteScale) * 1e8) / 1e8;
}

export function toQuoteUnits(
  majorPrice: number,
  instrument: Pick<Instrument, "quoteScale">,
): number {
  return Math.round(majorPrice * instrument.quoteScale * 1e8) / 1e8;
}
