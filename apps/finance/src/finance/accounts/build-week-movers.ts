import type { BalanceSeries } from "../domain/balance/compute-balance-days.ts";
import type { FxIndex } from "../domain/balance/create-fx-index.ts";
import {
  accountBalanceAt,
  type NetWorthAccount,
} from "../domain/balance/net-worth-at.ts";
import { toEpochDay } from "../domain/dates/to-epoch-day.ts";

export interface WeekMover<TAccount> {
  account: TAccount;
  /** What the account added to net worth since `from`, in minor units of the base currency. */
  changeMinor: number;
}

interface WeekMoversInput<TAccount extends NetWorthAccount> {
  accounts: readonly TAccount[];
  seriesByAccount: ReadonlyMap<string, BalanceSeries>;
  fx: FxIndex;
  /** The day the change starts from, at its end. */
  from: string;
  /** The day the change runs to, at its end. */
  to: string;
  /** How many accounts to keep. */
  limit: number;
}

/**
 * The accounts that moved net worth most between the end of `from` and the
 * end of `to`, biggest move first, gains and losses alike. Each balance is
 * in the base currency at its own day's rate, as in `netWorthAt`, so the
 * changes add up to the change of net worth. An account that is not counted
 * in net worth, or that did not move, is left out.
 */
export function buildWeekMovers<TAccount extends NetWorthAccount>({
  accounts,
  seriesByAccount,
  fx,
  from,
  to,
  limit,
}: WeekMoversInput<TAccount>): WeekMover<TAccount>[] {
  const fromEpochDay = toEpochDay(from);
  const toEpoch = toEpochDay(to);
  const movers: WeekMover<TAccount>[] = [];
  for (const account of accounts) {
    if (account.excludedFromNetWorth) continue;
    const series = seriesByAccount.get(account.id);
    const before = fx.toBase(
      accountBalanceAt(account, series, from),
      account.currency,
      fromEpochDay,
    );
    const after = fx.toBase(
      accountBalanceAt(account, series, to),
      account.currency,
      toEpoch,
    );
    const changeMinor = Math.round(after - before) || 0;
    if (changeMinor !== 0) movers.push({ account, changeMinor });
  }
  return movers
    .sort((a, b) => Math.abs(b.changeMinor) - Math.abs(a.changeMinor))
    .slice(0, limit);
}
