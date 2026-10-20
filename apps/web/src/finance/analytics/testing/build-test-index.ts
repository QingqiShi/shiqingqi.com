import {
  buildAnalyticsIndex,
  type AnalyticsIndexSource,
} from "../build-analytics-index.ts";

type IndexTransaction = AnalyticsIndexSource["transactions"][number];

/** A posted expense with no Payee or Member, for small analytics fixtures. */
export function postedRow(
  id: string,
  date: string,
  amountMinor: number,
  categoryId: string | null,
  kind = "expense",
): IndexTransaction {
  return {
    id,
    kind,
    status: "posted",
    date,
    amountMinor,
    categoryId,
    payeeId: null,
    memberId: null,
    deletedAt: null,
  };
}

/** An analytics index of `transactions` over top-level Categories only. */
export function buildTestIndex(
  transactions: readonly IndexTransaction[],
  categoryIds: readonly string[],
) {
  return buildAnalyticsIndex({
    transactions,
    transactionTags: [],
    categories: categoryIds.map((id) => ({ id, parentId: null })),
    payees: [],
    members: [],
    tags: [],
  });
}
