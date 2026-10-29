import { DEFAULT_HOUSEHOLD_TIME_ZONE } from "../domain/dates/default-household-time-zone.ts";
import { todayInTimeZone } from "../domain/dates/today-in-time-zone.ts";
import type { ReplicaSnapshot } from "../replica/types.ts";
import { selectEntriesByTransaction } from "../store/select-entries-by-transaction.ts";
import { selectTransactionsByDateDesc } from "../store/select-transactions-by-date-desc.ts";
import type { EntryRow, TransactionRow } from "../sync/row-schemas.ts";
import { isInReview } from "./is-in-review.ts";

interface Cached {
  entriesByTransaction: ReadonlyMap<string, readonly EntryRow[]>;
  accounts: ReplicaSnapshot["tables"]["accounts"];
  today: string;
  ids: ReadonlySet<string>;
}

const cache = new WeakMap<readonly TransactionRow[], Cached>();

/** The ids of the live Transactions in Review today; the same set until the Transactions, Entries, Accounts or the day change. */
export function selectReviewIds(
  snapshot: ReplicaSnapshot,
): ReadonlySet<string> {
  const rows = selectTransactionsByDateDesc(snapshot);
  const entriesByTransaction = selectEntriesByTransaction(snapshot);
  const accounts = snapshot.tables.accounts;
  const today = todayInTimeZone(
    snapshot.household?.timezone ?? DEFAULT_HOUSEHOLD_TIME_ZONE,
  );
  const cached = cache.get(rows);
  if (
    cached?.entriesByTransaction === entriesByTransaction &&
    cached.accounts === accounts &&
    cached.today === today
  ) {
    return cached.ids;
  }
  const ids = new Set<string>();
  for (const row of rows) {
    if (
      isInReview(row, entriesByTransaction.get(row.id) ?? [], accounts, today)
    ) {
      ids.add(row.id);
    }
  }
  cache.set(rows, { entriesByTransaction, accounts, today, ids });
  return ids;
}
