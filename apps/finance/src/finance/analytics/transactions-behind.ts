import type { TransactionsDestination } from "../navigation/finance-href.ts";
import type { TransactionKind } from "../transactions/transaction-filters.ts";
import type { AnalyticsKind } from "./types.ts";

const KINDS: Record<AnalyticsKind, readonly TransactionKind[]> = {
  spending: ["expense"],
  income: ["income"],
  net: ["expense", "income"],
};

/** The Transactions list filtered to what an analytics figure adds up. */
export function transactionsBehind(filter: {
  from: string;
  to: string;
  kind: AnalyticsKind;
  member: string | null;
  categoryIds?: readonly string[];
  payeeId?: string;
  tagId?: string;
}): TransactionsDestination {
  return {
    screen: "transactions",
    filters: {
      from: filter.from,
      to: filter.to,
      kinds: KINDS[filter.kind],
      memberIds: filter.member === null ? [] : [filter.member],
      categoryIds: filter.categoryIds ?? [],
      payeeIds: filter.payeeId === undefined ? [] : [filter.payeeId],
      tagIds: filter.tagId === undefined ? [] : [filter.tagId],
    },
  };
}
