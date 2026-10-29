import type {
  AccountRow,
  EntryRow,
  TransactionRow,
} from "../sync/row-schemas.ts";
import { transferLegs } from "./describe-transaction.ts";

/**
 * The amount a row of the list shows, in its account's currency: the money
 * that left or reached the first account of the Transaction. A transfer
 * shows the money that left.
 */
export function shownAmount(
  row: Pick<TransactionRow, "kind">,
  entries: readonly EntryRow[],
  accountById: ReadonlyMap<string, Pick<AccountRow, "currency">>,
  baseCurrency: string,
) {
  const entry =
    row.kind === "transfer" ? transferLegs(entries).from : entries.at(0);
  return {
    amountMinor: entry?.amountMinor ?? 0,
    currency:
      (entry && accountById.get(entry.accountId)?.currency) ?? baseCurrency,
  };
}
