import type { Instrument } from "../types.ts";

export function toGbp(
  amount: number,
  instrument: Pick<Instrument, "currency">,
  gbpUsd: number,
): number {
  return instrument.currency === "USD" ? amount / gbpUsd : amount;
}
