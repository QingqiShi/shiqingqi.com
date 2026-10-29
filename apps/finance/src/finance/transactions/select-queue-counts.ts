import { DEFAULT_HOUSEHOLD_TIME_ZONE } from "../domain/dates/default-household-time-zone.ts";
import { todayInTimeZone } from "../domain/dates/today-in-time-zone.ts";
import type { ReplicaSnapshot } from "../replica/types.ts";
import { selectTransactionsByDateDesc } from "../store/select-transactions-by-date-desc.ts";
import { isFutureExpected } from "./is-future-expected.ts";
import { selectReviewIds } from "./select-review-ids.ts";

interface QueueCounts {
  /** Transactions in Review. */
  review: number;
  /** Expected Transactions dated today or earlier, waiting for Confirm or Skip. */
  expected: number;
}

const cache = new WeakMap<ReadonlySet<string>, QueueCounts>();

/** How many Transactions wait in Review and as Expected; the same object until either changes. */
export function selectQueueCounts(snapshot: ReplicaSnapshot): QueueCounts {
  const reviewIds = selectReviewIds(snapshot);
  const cached = cache.get(reviewIds);
  if (cached) return cached;
  const today = todayInTimeZone(
    snapshot.household?.timezone ?? DEFAULT_HOUSEHOLD_TIME_ZONE,
  );
  let expected = 0;
  for (const row of selectTransactionsByDateDesc(snapshot)) {
    if (row.status === "expected" && !isFutureExpected(row, today)) expected++;
  }
  const counts = { review: reviewIds.size, expected };
  cache.set(reviewIds, counts);
  return counts;
}
