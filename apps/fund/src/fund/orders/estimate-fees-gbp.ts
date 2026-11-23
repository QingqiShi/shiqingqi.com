import { TRADING_COSTS } from "../guardrails.ts";
import { roundPennies } from "../ledger/round-pennies.ts";
import { toGbp } from "../ledger/to-gbp.ts";
import type { Instrument } from "../types.ts";

export interface EstimateFeesInput {
  instrument: Pick<Instrument, "exchange" | "currency">;
  side: "buy" | "sell";
  quantity: number;
  /** Major units. */
  price: number;
  /** USD for one GBP. */
  gbpUsd: number;
}

export function estimateFeesGbp({
  instrument,
  side,
  quantity,
  price,
  gbpUsd,
}: EstimateFeesInput): number {
  const valueGbp = toGbp(quantity * price, instrument, gbpUsd);
  let pct = 0;
  if (instrument.exchange === "LSE" && side === "buy") {
    pct += TRADING_COSTS.ukStampDutyPct;
  }
  if (instrument.currency === "USD") pct += TRADING_COSTS.fxFeePct;
  return roundPennies((valueGbp * pct) / 100);
}
