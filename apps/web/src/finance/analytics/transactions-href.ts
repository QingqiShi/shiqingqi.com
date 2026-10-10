import {
  EMPTY_TRANSACTION_FILTERS,
  transactionFilters,
  type TransactionKind,
} from "../transactions/transaction-filters.ts";
import type { AnalyticsKind } from "./types.ts";

const KINDS: Record<AnalyticsKind, readonly TransactionKind[]> = {
  spending: ["expense"],
  income: ["income"],
  net: ["expense", "income"],
};

/**
 * The locale-free path of the Transactions list filtered to what an
 * analytics figure adds up, through the list's search-param contract.
 */
export function transactionsHref(filter: {
  from: string;
  to: string;
  kind: AnalyticsKind;
  member: string | null;
  categoryIds?: readonly string[];
  payeeId?: string;
  tagId?: string;
}): string {
  const params = transactionFilters.write(new URLSearchParams(), {
    ...EMPTY_TRANSACTION_FILTERS,
    from: filter.from,
    to: filter.to,
    kinds: KINDS[filter.kind],
    memberIds: filter.member === null ? [] : [filter.member],
    categoryIds: filter.categoryIds ?? [],
    payeeIds: filter.payeeId === undefined ? [] : [filter.payeeId],
    tagIds: filter.tagId === undefined ? [] : [filter.tagId],
  });
  return `/finance/transactions?${params.toString()}`;
}
