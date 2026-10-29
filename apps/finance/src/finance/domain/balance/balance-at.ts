import { toEpochDay } from "../dates/to-epoch-day.ts";
import { upperBound } from "../upper-bound.ts";
import type { BalanceSeries } from "./compute-balance-days.ts";

/** The balance at the end of `epochDay`: the last change on or before it, else 0. */
export function balanceAtEpochDay(
  series: BalanceSeries,
  epochDay: number,
): number {
  const { days, balances } = series;
  const low = upperBound(days, epochDay);
  return low === 0 ? 0 : balances[low - 1];
}

/** The balance at the end of `day` (`YYYY-MM-DD`). */
export function balanceAt(series: BalanceSeries, day: string): number {
  return balanceAtEpochDay(series, toEpochDay(day));
}
