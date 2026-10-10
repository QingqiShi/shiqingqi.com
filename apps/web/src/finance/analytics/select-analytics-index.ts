import type { ReplicaSnapshot } from "../replica/types.ts";
import { selectTransactionsByDateDesc } from "../store/select-transactions-by-date-desc.ts";
import { buildAnalyticsIndex } from "./build-analytics-index.ts";
import type { AnalyticsIndex } from "./types.ts";

let last: {
  inputs: readonly unknown[];
  index: AnalyticsIndex;
} | null = null;

/**
 * The analytics index of the Replica, built again only when a table it
 * reads changes. `transactionsFrom` is the Replica window's first day.
 */
export function selectAnalyticsIndex(
  snapshot: ReplicaSnapshot,
  transactionsFrom: string | null,
): AnalyticsIndex {
  const { tables } = snapshot;
  const transactions = selectTransactionsByDateDesc(snapshot);
  const inputs = [
    transactions,
    tables.transactionTags,
    tables.categories,
    tables.payees,
    tables.members,
    tables.tags,
    tables.monthTotals,
    transactionsFrom,
  ];
  if (last?.inputs.every((input, at) => input === inputs[at])) {
    return last.index;
  }
  const started = performance.now();
  const index = buildAnalyticsIndex({
    transactions,
    transactionTags: tables.transactionTags.values(),
    categories: [...tables.categories.values()],
    payees: tables.payees.values(),
    members: tables.members.values(),
    tags: tables.tags.values(),
    monthTotals: tables.monthTotals.values(),
    transactionsFrom,
  });
  if (process.env.NODE_ENV !== "production") {
    performance.measure("finance:analytics-index", { start: started });
  }
  last = { inputs, index };
  return index;
}
