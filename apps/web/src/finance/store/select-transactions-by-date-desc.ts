import type { ReplicaSnapshot } from "../replica/types.ts";
import type { TransactionRow } from "../sync/row-schemas.ts";
import { compareTransactionsByDateDesc } from "./compare-transactions-by-date-desc.ts";
import { sortedInsert, sortedRemove } from "./sorted-insert.ts";

/** Above this many changed rows a full sort is cheaper than one splice per row. */
const INCREMENTAL_LIMIT = 256;

const cache = new WeakMap<
  ReadonlyMap<string, TransactionRow>,
  readonly TransactionRow[]
>();

function isLive(row: TransactionRow | undefined): row is TransactionRow {
  return row !== undefined && row.deletedAt === null;
}

/**
 * Every Transaction that is not deleted (posted and Expected), newest first.
 * When a snapshot changes a few rows, the order is patched from the previous
 * one instead of sorted again.
 */
export function selectTransactionsByDateDesc(
  snapshot: ReplicaSnapshot,
): readonly TransactionRow[] {
  const rows = snapshot.tables.transactions;
  const cached = cache.get(rows);
  if (cached) return cached;

  const change = snapshot.changes.transactions;
  const previous = change ? cache.get(change.from) : undefined;
  let sorted: TransactionRow[];
  if (change && previous && change.keys.size <= INCREMENTAL_LIMIT) {
    sorted = [...previous];
    for (const key of change.keys) {
      const before = change.from.get(key);
      if (isLive(before)) {
        sortedRemove(sorted, before, compareTransactionsByDateDesc);
      }
      const after = rows.get(key);
      if (isLive(after)) {
        sortedInsert(sorted, after, compareTransactionsByDateDesc);
      }
    }
  } else {
    sorted = [...rows.values()]
      .filter(isLive)
      .sort(compareTransactionsByDateDesc);
  }
  cache.set(rows, sorted);
  return sorted;
}
