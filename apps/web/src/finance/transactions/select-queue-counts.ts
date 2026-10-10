import type { ReplicaSnapshot } from "../replica/types.ts";
import { selectTransactionsByDateDesc } from "../store/select-transactions-by-date-desc.ts";
import type { TransactionRow } from "../sync/row-schemas.ts";

interface QueueCounts {
  /** Transactions that need Review. */
  review: number;
  /** Expected Transactions waiting for Confirm or Skip. */
  expected: number;
}

const cache = new WeakMap<readonly TransactionRow[], QueueCounts>();

/** How many Transactions wait in Review and as Expected; the same object until the Transactions change. */
export function selectQueueCounts(snapshot: ReplicaSnapshot): QueueCounts {
  const rows = selectTransactionsByDateDesc(snapshot);
  const cached = cache.get(rows);
  if (cached) return cached;
  const counts = { review: 0, expected: 0 };
  for (const row of rows) {
    if (row.needsReview) counts.review++;
    if (row.status === "expected") counts.expected++;
  }
  cache.set(rows, counts);
  return counts;
}
