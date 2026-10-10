import type { ReplicaSnapshot } from "../replica/types.ts";
import type { EntryRow, TransactionRow } from "../sync/row-schemas.ts";
import { selectEntriesByTransaction } from "./select-entries-by-transaction.ts";
import { selectTransactionsByDateDesc } from "./select-transactions-by-date-desc.ts";

const cache = new WeakMap<
  readonly TransactionRow[],
  WeakMap<
    ReadonlyMap<string, readonly EntryRow[]>,
    ReadonlyMap<string, readonly TransactionRow[]>
  >
>();

/** Each account's Transactions (any Entry on it), newest first. A transfer is under both accounts. */
export function selectTransactionsByAccount(
  snapshot: ReplicaSnapshot,
): ReadonlyMap<string, readonly TransactionRow[]> {
  const sorted = selectTransactionsByDateDesc(snapshot);
  const entries = selectEntriesByTransaction(snapshot);
  let byEntries = cache.get(sorted);
  const cached = byEntries?.get(entries);
  if (cached) return cached;

  const grouped = new Map<string, TransactionRow[]>();
  for (const transaction of sorted) {
    for (const entry of entries.get(transaction.id) ?? []) {
      const list = grouped.get(entry.accountId);
      if (!list) grouped.set(entry.accountId, [transaction]);
      else if (list.at(-1) !== transaction) list.push(transaction);
    }
  }
  if (!byEntries) {
    byEntries = new WeakMap();
    cache.set(sorted, byEntries);
  }
  byEntries.set(entries, grouped);
  return grouped;
}
