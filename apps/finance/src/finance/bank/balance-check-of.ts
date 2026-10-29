import { balanceAt } from "../domain/balance/balance-at.ts";
import type { BalanceSeries } from "../domain/balance/compute-balance-days.ts";
import type { BankLinkRow } from "../sync/row-schemas.ts";

/** A balance check that found a difference. */
export interface BalanceCheck {
  /** The day the bank gave its balance for. */
  on: string;
  bankMinor: number;
  oursMinor: number;
  /** Our balance minus the bank's. */
  ourExcessMinor: number;
}

/**
 * The balance check of a Bank link: the bank's balance against ours at the
 * end of the day the bank gave it. Null when the bank gave no balance, while
 * bank rows wait for the AI step, or when the balances agree.
 */
export function balanceCheckOf(
  link: Pick<
    BankLinkRow,
    "bankBalanceMinor" | "bankBalanceOn" | "bankRowsWaiting"
  >,
  oursAt: (day: string) => number,
): BalanceCheck | null {
  const { bankBalanceMinor: bankMinor, bankBalanceOn: on } = link;
  if (bankMinor === null || on === null || link.bankRowsWaiting) return null;
  const oursMinor = oursAt(on);
  if (oursMinor === bankMinor) return null;
  return { on, bankMinor, oursMinor, ourExcessMinor: oursMinor - bankMinor };
}

/**
 * Our side of the balance check: the account's posted Entries and
 * Valuations alone. Unlike net worth, a closed account keeps its balance,
 * as the bank still reports one.
 */
export function ledgerBalanceAt(
  series: BalanceSeries | undefined,
  day: string,
) {
  return series ? balanceAt(series, day) : 0;
}
