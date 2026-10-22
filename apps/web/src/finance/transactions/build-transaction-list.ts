import { minorUnitsToDecimalString } from "../domain/money/to-minor-units.ts";
import type { EntryRow, TransactionRow } from "../sync/row-schemas.ts";
import { isFutureExpected } from "./is-future-expected.ts";
import { sumDayTotals } from "./sum-day-totals.ts";
import type { TransactionFilters } from "./transaction-filters.ts";

export type TransactionListItem =
  | {
      type: "day";
      day: string;
      /** Posted expenses of the day net of refunds: negative for money out. */
      expenseMinor: number;
      incomeMinor: number;
    }
  | { type: "transaction"; row: TransactionRow };

interface TransactionListSources {
  /** Every live Transaction, newest first. */
  rows: readonly TransactionRow[];
  entriesByTransaction: ReadonlyMap<string, readonly EntryRow[]>;
  tagIdsByTransaction: ReadonlyMap<string, readonly string[]>;
  categoryDescendantsById: ReadonlyMap<string, ReadonlySet<string>>;
  /** The Transactions in Review, from `selectReviewIds`. */
  reviewIds: ReadonlySet<string>;
  baseCurrency: string;
}

interface TransactionListOptions {
  today: string;
}

interface TransactionList {
  items: TransactionListItem[];
  /** The Transactions in `items`, in list order. */
  transactions: TransactionRow[];
  /** Each Transaction's position in `items`. */
  indexById: Map<string, number>;
}

function anyOf(ids: readonly string[]) {
  return ids.length === 0 ? null : new Set(ids);
}

/** Builds the test for one Transaction from the filters, so the loop does no work for a filter that is off. */
function matcherFor(
  filters: TransactionFilters,
  sources: TransactionListSources,
) {
  const accounts = anyOf(filters.accountIds);
  const payees = anyOf(filters.payeeIds);
  const members = anyOf(filters.memberIds);
  const tags = anyOf(filters.tagIds);
  const kinds = anyOf(filters.kinds);
  let categories: Set<string> | null = null;
  if (filters.categoryIds.length > 0) {
    categories = new Set();
    for (const id of filters.categoryIds) {
      for (const descendant of sources.categoryDescendantsById.get(id) ?? [
        id,
      ]) {
        categories.add(descendant);
      }
    }
  }
  const words = filters.query
    .normalize("NFKC")
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word !== "");

  return (row: TransactionRow) => {
    if (filters.review && !sources.reviewIds.has(row.id)) return false;
    if (filters.expected && row.status !== "expected") return false;
    if (filters.from !== null && row.date < filters.from) return false;
    if (filters.to !== null && row.date > filters.to) return false;
    if (kinds && !kinds.has(row.kind)) return false;
    if (payees && (row.payeeId === null || !payees.has(row.payeeId))) {
      return false;
    }
    if (members && (row.memberId === null || !members.has(row.memberId))) {
      return false;
    }
    if (
      categories &&
      (row.categoryId === null || !categories.has(row.categoryId))
    ) {
      return false;
    }
    if (accounts) {
      const entries = sources.entriesByTransaction.get(row.id) ?? [];
      if (!entries.some((entry) => accounts.has(entry.accountId))) return false;
    }
    if (tags) {
      const ids = sources.tagIdsByTransaction.get(row.id) ?? [];
      if (!ids.some((id) => tags.has(id))) return false;
    }
    for (const word of words) {
      if (row.searchText.includes(word)) continue;
      if (/^[\d.,]+$/.test(word)) {
        const amount = minorUnitsToDecimalString(
          Math.abs(row.amountMinor),
          sources.baseCurrency,
        );
        if (amount.startsWith(word.replaceAll(",", ""))) continue;
      }
      return false;
    }
    return true;
  };
}

function dayItem(day: string, rows: readonly TransactionRow[]) {
  return { type: "day" as const, day, ...sumDayTotals(rows) };
}

/**
 * The rows the list shows for `filters`: a header per day with the day's
 * totals, then the day's Transactions, Expected ones first. An Expected
 * Transaction dated after today is not in the list until its day.
 */
export function buildTransactionList(
  sources: TransactionListSources,
  filters: TransactionFilters,
  options: TransactionListOptions,
): TransactionList {
  const matches = matcherFor(filters, sources);
  const items: TransactionListItem[] = [];
  const transactions: TransactionRow[] = [];
  const indexById = new Map<string, number>();
  let day: string | null = null;
  let expected: TransactionRow[] = [];
  let posted: TransactionRow[] = [];

  const flush = () => {
    if (day === null) return;
    const ordered = expected.length === 0 ? posted : [...expected, ...posted];
    items.push(dayItem(day, ordered));
    for (const row of ordered) {
      indexById.set(row.id, items.length);
      items.push({ type: "transaction", row });
      transactions.push(row);
    }
    expected = [];
    posted = [];
  };

  for (const row of sources.rows) {
    if (isFutureExpected(row, options.today) || !matches(row)) continue;
    if (row.date !== day) {
      flush();
      day = row.date;
    }
    if (row.status === "expected") expected.push(row);
    else posted.push(row);
  }
  flush();
  return { items, transactions, indexById };
}
