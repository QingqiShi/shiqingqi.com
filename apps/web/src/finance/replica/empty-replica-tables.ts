import type { ReplicaTables } from "./types.ts";

const EMPTY = new Map<string, never>();

/** A Replica with no rows. */
export function emptyReplicaTables(): ReplicaTables {
  return {
    members: EMPTY,
    accountGroups: EMPTY,
    accounts: EMPTY,
    valuations: EMPTY,
    categories: EMPTY,
    payees: EMPTY,
    payeeAliases: EMPTY,
    tags: EMPTY,
    rules: EMPTY,
    transactions: EMPTY,
    entries: EMPTY,
    transactionTags: EMPTY,
    accountBalanceDays: EMPTY,
    monthTotals: EMPTY,
    fxRates: EMPTY,
    bankLinks: EMPTY,
  };
}
