import type { BalanceSeries } from "../domain/balance/compute-balance-days.ts";
import type { FxIndex } from "../domain/balance/create-fx-index.ts";
import type { NetWorthAccount } from "../domain/balance/net-worth-at.ts";
import { toEpochDay } from "../domain/dates/to-epoch-day.ts";

/** The index of the last change on or before `epochDay`, or -1. */
function lastIndexOnOrBefore(days: Int32Array, epochDay: number) {
  let low = 0;
  let high = days.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (days[middle] <= epochDay) low = middle + 1;
    else high = middle;
  }
  return low - 1;
}

/**
 * Adds one account's end-of-day balance on each of `days` (ascending) into
 * `out`, multiplied by `toBase`. One binary search finds the first day; the
 * rest walk forward, so a range costs O(points + changes).
 */
function addSeries(
  out: Float64Array,
  days: Int32Array,
  series: BalanceSeries,
  closedOn: number | null,
  toBase: ((amount: number, epochDay: number) => number) | null,
) {
  const changes = series.days;
  if (changes.length === 0 || days.length === 0) return;
  let index = lastIndexOnOrBefore(changes, days[0]);
  for (let point = 0; point < days.length; point++) {
    const day = days[point];
    if (closedOn !== null && day >= closedOn) break;
    while (index + 1 < changes.length && changes[index + 1] <= day) index++;
    if (index < 0) continue;
    const balance = series.balances[index];
    out[point] += toBase ? toBase(balance, day) : balance;
  }
}

/** One account's balance at the end of each of `days`, in its own currency: 0 from `closedOn` on. */
export function sampleAccountBalance(
  series: BalanceSeries | undefined,
  closedOn: string | null,
  days: Int32Array,
): Float64Array {
  const out = new Float64Array(days.length);
  if (series) {
    addSeries(
      out,
      days,
      series,
      closedOn === null ? null : toEpochDay(closedOn),
      null,
    );
  }
  return out;
}

/**
 * Net worth at the end of each of `days`, in minor units of the base
 * currency, by the same rules as `netWorthAt`: excluded accounts never
 * count, closed accounts count until `closedOn`, and each point is rounded
 * once.
 */
export function sampleBalances(
  accounts: readonly NetWorthAccount[],
  seriesByAccount: ReadonlyMap<string, BalanceSeries>,
  fx: FxIndex,
  days: Int32Array,
): Float64Array {
  const out = new Float64Array(days.length);
  for (const account of accounts) {
    if (account.excludedFromNetWorth) continue;
    const series = seriesByAccount.get(account.id);
    if (!series) continue;
    const toBase =
      account.currency === fx.baseCurrency
        ? null
        : (amount: number, day: number) =>
            fx.toBase(amount, account.currency, day);
    addSeries(
      out,
      days,
      series,
      account.closedOn === null ? null : toEpochDay(account.closedOn),
      toBase,
    );
  }
  for (let point = 0; point < out.length; point++) {
    out[point] = Math.round(out[point]) || 0;
  }
  return out;
}
