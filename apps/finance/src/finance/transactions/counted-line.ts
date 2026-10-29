import {
  countedEntries,
  mainEntryOf,
} from "../domain/transactions/create-transaction-amount.ts";
import type {
  AccountRow,
  EntryRow,
  TransactionRow,
} from "../sync/row-schemas.ts";
import type { shownAmount } from "./shown-amount.ts";

/**
 * What a row of the list adds to its day's totals, when the amount it shows
 * does not say it: the Household's share of a shared bill, the income left
 * after a repayment of money owed, no amount for a whole repayment, the
 * signed amount when money owed changes it in another way, or the amount in
 * the base currency of a foreign account. Null when the shown amount is what
 * counts.
 */
export type CountedLine =
  | { type: "share"; amountMinor: number }
  | { type: "incomeAfterRepayment"; amountMinor: number }
  | { type: "notCounted" }
  | { type: "counts"; amountMinor: number }
  | { type: "converted"; amountMinor: number }
  | null;

export function countedLine(
  row: Pick<TransactionRow, "kind" | "date">,
  entries: readonly EntryRow[],
  countedMinor: number,
  shown: ReturnType<typeof shownAmount>,
  accountById: ReadonlyMap<string, Pick<AccountRow, "kind" | "currency">>,
  baseCurrency: string,
): CountedLine {
  const counted = countedEntries(row, entries, (accountId) =>
    accountById.get(accountId),
  );
  const main = mainEntryOf(counted);
  if (main === undefined) return null;
  const owedBack = counted.filter((entry) => entry !== main);
  if (owedBack.length > 0) {
    if (countedMinor === 0) return { type: "notCounted" };
    const direction = Math.sign(main.amountMinor);
    const owedBackReducesIt =
      Math.sign(countedMinor) === direction &&
      owedBack.every((entry) => Math.sign(entry.amountMinor) === -direction);
    if (!owedBackReducesIt)
      return { type: "counts", amountMinor: countedMinor };
    return row.kind === "income"
      ? { type: "incomeAfterRepayment", amountMinor: countedMinor }
      : { type: "share", amountMinor: countedMinor };
  }
  return shown.currency === baseCurrency
    ? null
    : { type: "converted", amountMinor: countedMinor };
}
