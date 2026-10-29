import type { ReplicaSnapshot } from "../replica/types.ts";
import type { TransactionRow } from "../sync/row-schemas.ts";
import { selectTransactionsByDateDesc } from "./select-transactions-by-date-desc.ts";

const cache = new WeakMap<
  readonly TransactionRow[],
  ReadonlyMap<string, readonly TransactionRow[]>
>();

/** Each Payee's Transactions, newest first; for autocomplete and "same as last time". */
export function selectTransactionsByPayee(
  snapshot: ReplicaSnapshot,
): ReadonlyMap<string, readonly TransactionRow[]> {
  const sorted = selectTransactionsByDateDesc(snapshot);
  const cached = cache.get(sorted);
  if (cached) return cached;
  const grouped = new Map<string, TransactionRow[]>();
  for (const transaction of sorted) {
    if (transaction.payeeId === null) continue;
    const list = grouped.get(transaction.payeeId);
    if (list) list.push(transaction);
    else grouped.set(transaction.payeeId, [transaction]);
  }
  cache.set(sorted, grouped);
  return grouped;
}
