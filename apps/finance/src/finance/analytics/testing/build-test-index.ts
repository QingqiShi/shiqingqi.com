import {
  buildAnalyticsIndex,
  type AnalyticsIndexSource,
} from "../build-analytics-index.ts";

/** A Transaction of the index, with its amount in the base currency. */
type TestTransaction = AnalyticsIndexSource["transactions"][number] & {
  amountMinor: number;
};

/** A posted expense with no Payee or Member, for small analytics fixtures. */
export function postedRow(
  id: string,
  date: string,
  amountMinor: number,
  categoryId: string | null,
  kind = "expense",
): TestTransaction {
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
  transactions: readonly TestTransaction[],
  categoryIds: readonly string[],
) {
  return buildAnalyticsIndex({
    transactions,
    amounts: new Map(transactions.map((row) => [row.id, row.amountMinor])),
    transactionTags: [],
    categories: categoryIds.map((id) => ({ id, parentId: null })),
    payees: [],
    members: [],
    tags: [],
  });
}
