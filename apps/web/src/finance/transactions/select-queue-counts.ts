import type { ReplicaSnapshot } from "../replica/types.ts";
import { selectTransactionsByDateDesc } from "../store/select-transactions-by-date-desc.ts";
import { selectReviewIds } from "./select-review-ids.ts";

interface QueueCounts {
  /** Transactions in Review. */
  review: number;
  /** Expected Transactions waiting for Confirm or Skip. */
  expected: number;
}

const cache = new WeakMap<ReadonlySet<string>, QueueCounts>();

/** How many Transactions wait in Review and as Expected; the same object until either changes. */
export function selectQueueCounts(snapshot: ReplicaSnapshot): QueueCounts {
  const reviewIds = selectReviewIds(snapshot);
  const cached = cache.get(reviewIds);
  if (cached) return cached;
  let expected = 0;
  for (const row of selectTransactionsByDateDesc(snapshot)) {
    if (row.status === "expected") expected++;
  }
  const counts = { review: reviewIds.size, expected };
  cache.set(reviewIds, counts);
  return counts;
}
