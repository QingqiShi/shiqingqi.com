import type { BalanceSeries } from "../domain/balance/compute-balance-days.ts";

/**
 * The first epoch day a series holds a balance other than zero, or null.
 * An opening valuation of zero years before any money moved does not
 * stretch the "All" range.
 */
export function firstActiveDay(series: BalanceSeries): number | null {
  for (let index = 0; index < series.days.length; index++) {
    if (series.balances[index] !== 0) return series.days[index];
  }
  return null;
}
