import { toEpochDay } from "../dates/to-epoch-day.ts";
import { balanceAtEpochDay } from "./balance-at.ts";
import type { BalanceSeries } from "./compute-balance-days.ts";
import type { FxIndex } from "./create-fx-index.ts";

export interface NetWorthAccount {
  readonly id: string;
  readonly currency: string;
  readonly excludedFromNetWorth: boolean;
  /** From this day on the balance is 0; history before it still counts. */
  readonly closedOn: string | null;
}

/** An account's balance at the end of `day` in its own currency: 0 from `closedOn` on. */
export function accountBalanceAt(
  account: Pick<NetWorthAccount, "closedOn">,
  series: BalanceSeries | undefined,
  day: string,
): number {
  if (!series || (account.closedOn !== null && day >= account.closedOn)) {
    return 0;
  }
  return balanceAtEpochDay(series, toEpochDay(day));
}

/**
 * Net worth at the end of `day` in minor units of the FX index's base
 * currency: the sum of every counted account's balance, converted at the
 * latest rate on or before `day`. Excluded accounts and accounts closed on or
 * before `day` count as 0. The sum is rounded once, at the end.
 */
export function netWorthAt(
  accounts: readonly NetWorthAccount[],
  seriesByAccount: ReadonlyMap<string, BalanceSeries>,
  fx: FxIndex,
  day: string,
): number {
  const epochDay = toEpochDay(day);
  let total = 0;
  for (const account of accounts) {
    if (account.excludedFromNetWorth) continue;
    if (account.closedOn !== null && day >= account.closedOn) continue;
    const series = seriesByAccount.get(account.id);
    if (!series) continue;
    total += fx.toBase(
      balanceAtEpochDay(series, epochDay),
      account.currency,
      epochDay,
    );
  }
  return Math.round(total) || 0;
}
