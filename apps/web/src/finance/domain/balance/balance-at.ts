import { toEpochDay } from "../dates/to-epoch-day.ts";
import type { BalanceSeries } from "./compute-balance-days.ts";

/** The balance at the end of `epochDay`: the last change on or before it, else 0. */
export function balanceAtEpochDay(
  series: BalanceSeries,
  epochDay: number,
): number {
  const { days, balances } = series;
  let low = 0;
  let high = days.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (days[middle] <= epochDay) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return low === 0 ? 0 : balances[low - 1];
}

/** The balance at the end of `day` (`YYYY-MM-DD`). */
export function balanceAt(series: BalanceSeries, day: string): number {
  return balanceAtEpochDay(series, toEpochDay(day));
}
