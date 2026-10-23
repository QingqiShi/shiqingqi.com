import type { FxIndex } from "../balance/create-fx-index.ts";
import { toEpochDay } from "../dates/to-epoch-day.ts";

export interface AmountTransaction {
  readonly kind: string;
  readonly date: string;
}

export interface AmountEntry {
  readonly accountId: string;
  readonly amountMinor: number;
  readonly position: number;
}

export interface AmountAccount {
  readonly kind: string;
  readonly currency: string;
}

export type AccountOf = (accountId: string) => AmountAccount | undefined;

/** The Entry the amount of an expense or income starts from: the one with the lowest position. */
export function mainEntryOf<Entry extends AmountEntry>(
  entries: readonly Entry[],
): Entry | undefined {
  let main: Entry | undefined;
  for (const entry of entries) {
    if (main === undefined || entry.position < main.position) main = entry;
  }
  return main;
}

/**
 * The Entries whose sum is the amount of an expense or income: the main
 * Entry and every other Entry on money owed to the Household. A shared bill
 * counts only the Household's part, and a repayment of money owed counts
 * nothing. An Entry on a loan does not count, so a purchase paid in
 * instalments counts in full. A transfer has none.
 */
export function countedEntries<Entry extends AmountEntry>(
  transaction: AmountTransaction,
  entries: readonly Entry[],
  accountOf: AccountOf,
): Entry[] {
  if (transaction.kind !== "expense" && transaction.kind !== "income") {
    return [];
  }
  const main = mainEntryOf(entries);
  if (main === undefined) return [];
  return entries.filter(
    (entry) =>
      entry === main || accountOf(entry.accountId)?.kind === "receivable",
  );
}

/** The amount of a Transaction in minor units of the base currency: negative for spending, positive for income and refunds, 0 for a transfer. */
export type TransactionAmountOf = (
  transaction: AmountTransaction,
  entries: readonly AmountEntry[],
) => number;

/**
 * Converts each counted Entry to the base currency at the rate on the
 * Transaction's date, and rounds the sum to whole minor units. It keeps the
 * rate of each currency and day it reads, because Analytics reads thousands
 * of Transactions on few days.
 */
export function createTransactionAmount(
  fx: FxIndex,
  accountOf: AccountOf,
): TransactionAmountOf {
  const factors = new Map<string, Map<string, number>>();
  const factorOf = (currency: string, date: string) => {
    let byDate = factors.get(currency);
    if (byDate === undefined) {
      byDate = new Map();
      factors.set(currency, byDate);
    }
    let factor = byDate.get(date);
    if (factor === undefined) {
      factor = fx.toBase(1, currency, toEpochDay(date));
      byDate.set(date, factor);
    }
    return factor;
  };

  return (transaction, entries) => {
    let total = 0;
    for (const entry of countedEntries(transaction, entries, accountOf)) {
      const currency = accountOf(entry.accountId)?.currency ?? fx.baseCurrency;
      total +=
        currency === fx.baseCurrency
          ? entry.amountMinor
          : entry.amountMinor * factorOf(currency, transaction.date);
    }
    return Math.round(total) || 0;
  };
}
