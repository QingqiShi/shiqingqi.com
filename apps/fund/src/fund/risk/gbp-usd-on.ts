import { lastOnOrBefore } from "../ledger/last-on-or-before.ts";
import type { FxSeries } from "../types.ts";

/**
 * USD for one GBP on a date: the newest rate on or before it, or the oldest
 * rate when the date is before the series. Null for an empty series.
 */
export function gbpUsdOn(fx: FxSeries, date: string): number | null {
  return (lastOnOrBefore(fx, date) ?? fx.at(0))?.gbpUsd ?? null;
}
