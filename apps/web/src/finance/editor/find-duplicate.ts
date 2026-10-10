import { daysBetween } from "../domain/dates/add-days.ts";
import type {
  EntryRow,
  TransactionRow,
  ValuationRow,
} from "../sync/row-schemas.ts";

interface DuplicateQuery {
  /** The Transaction being saved, so it never matches itself. */
  id: string | null;
  date: string;
  entries: readonly { accountId: string; amountMinor: number }[];
}

/**
 * A posted Transaction that looks like the one being saved: an Entry on the
 * same account with the same amount, dated within a day. Duplicates are
 * real, so the editor only asks.
 */
export function findDuplicate(
  query: DuplicateQuery,
  transactionsByAccount: ReadonlyMap<string, readonly TransactionRow[]>,
  entriesByTransaction: ReadonlyMap<string, readonly EntryRow[]>,
): TransactionRow | null {
  for (const wanted of query.entries) {
    for (const row of transactionsByAccount.get(wanted.accountId) ?? []) {
      if (row.date < query.date && daysBetween(row.date, query.date) > 1) {
        break;
      }
      if (row.id === query.id || row.status !== "posted") continue;
      if (Math.abs(daysBetween(row.date, query.date)) > 1) continue;
      const entries = entriesByTransaction.get(row.id) ?? [];
      if (
        entries.some(
          (entry) =>
            entry.accountId === wanted.accountId &&
            entry.amountMinor === wanted.amountMinor,
        )
      ) {
        return row;
      }
    }
  }
  return null;
}

/**
 * The latest Valuation of any of the accounts on or after `date`: a
 * Transaction dated before it does not change today's balance.
 */
export function latestValuationFrom(
  valuations: ReadonlyMap<string, ValuationRow>,
  accountIds: readonly string[],
  date: string,
): ValuationRow | null {
  if (accountIds.length === 0) return null;
  const wanted = new Set(accountIds);
  let latest: ValuationRow | null = null;
  for (const valuation of valuations.values()) {
    if (valuation.deletedAt !== null || !wanted.has(valuation.accountId)) {
      continue;
    }
    if (valuation.on < date) continue;
    if (!latest || valuation.on > latest.on) latest = valuation;
  }
  return latest;
}
