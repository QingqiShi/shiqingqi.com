import { balanceAt } from "../domain/balance/balance-at.ts";
import { computeBalanceDays } from "../domain/balance/compute-balance-days.ts";
import { applyToDraft } from "../mutations/apply-to-draft.ts";
import { rowMatcher } from "../mutations/row-matcher.ts";
import type { MutationContext, MutationDraft } from "../mutations/types.ts";
import { WaitForServer } from "../mutations/wait-for-server.ts";
import type { Mutation } from "../sync/mutation-schema.ts";
import {
  LIVE_ON_BOOTSTRAP_TABLES,
  type SyncTableName,
  type TransactionRow,
} from "../sync/row-schemas.ts";
import {
  createTablesDraft,
  type ChangedKeys,
  type TablesDraft,
} from "./create-tables-draft.ts";
import type { ReplicaRow, ReplicaTables } from "./types.ts";

export type LocalMutationContext = Omit<
  MutationContext,
  "actor" | "provenance"
>;

/** The account's balance at the end of `day` from the rows the Replica holds. */
function localBalanceAt(draft: TablesDraft, accountId: string, day: string) {
  const valuations = [];
  for (const valuation of draft.values("valuations")) {
    if (valuation.accountId === accountId && valuation.deletedAt === null) {
      valuations.push(valuation);
    }
  }
  const entries = [];
  for (const entry of draft.values("entries")) {
    if (entry.accountId !== accountId || entry.deletedAt !== null) continue;
    const transaction = draft.get("transactions", entry.transactionId);
    if (transaction?.deletedAt === null && transaction.status === "posted") {
      entries.push(entry);
    }
  }
  return balanceAt(computeBalanceDays(valuations, entries), day);
}

/** What a mutation wrote that the search text follows. */
interface Written {
  transactionIds: Set<string>;
  /** Payees and Categories whose name changed. */
  renamedPayeeIds: Set<string>;
  renamedCategoryIds: Set<string>;
}

/** The Replica's tables as a `MutationDraft`. */
function replicaDraft(draft: TablesDraft, written: Written): MutationDraft {
  return {
    get: (table, key) => draft.get(table, key),
    where<Table extends SyncTableName>(
      table: Table,
      match: Partial<ReplicaRow<Table>>,
    ) {
      const isMatch = rowMatcher(match);
      const found: ReplicaRow<Table>[] = [];
      for (const row of draft.values(table)) if (isMatch(row)) found.push(row);
      return found;
    },
    hasLive: (table, match) => {
      const isMatch = rowMatcher(match);
      for (const row of draft.values(table)) {
        if (row.deletedAt === null && isMatch(row)) return true;
      }
      return false;
    },
    balanceAt: (accountId, day) => localBalanceAt(draft, accountId, day),
    institutionIconVersion: () => undefined,
    mayLack: (table) => LIVE_ON_BOOTSTRAP_TABLES.has(table),
    put: (table, key, row) => {
      if (table === "transactions") written.transactionIds.add(key);
      if (table === "payees" || table === "categories") {
        const previous = draft.get(table, key);
        if (
          previous &&
          "name" in previous &&
          "name" in row &&
          previous.name !== row.name
        ) {
          (table === "payees"
            ? written.renamedPayeeIds
            : written.renamedCategoryIds
          ).add(key);
        }
      }
      draft.put(table, key, row);
    },
  };
}

/** The server's `search_text`: payee name, note and category name, lowercased. */
function searchTextOf(draft: TablesDraft, transaction: TransactionRow) {
  const payee =
    transaction.payeeId === null
      ? undefined
      : draft.get("payees", transaction.payeeId)?.name;
  const category =
    transaction.categoryId === null
      ? undefined
      : draft.get("categories", transaction.categoryId)?.name;
  return [payee, transaction.note || undefined, category]
    .filter((part) => part !== undefined)
    .join(" ")
    .toLowerCase();
}

/**
 * Brings `searchText` up to date as the server does after a write: on every
 * Transaction the mutation wrote, and on every Transaction of a Payee or
 * Category it renamed.
 */
function refreshSearchText(draft: TablesDraft, written: Written, now: string) {
  const ids = new Set(written.transactionIds);
  if (written.renamedPayeeIds.size > 0 || written.renamedCategoryIds.size > 0) {
    for (const row of draft.values("transactions")) {
      if (
        (row.payeeId !== null && written.renamedPayeeIds.has(row.payeeId)) ||
        (row.categoryId !== null &&
          written.renamedCategoryIds.has(row.categoryId))
      ) {
        ids.add(row.id);
      }
    }
  }
  for (const id of ids) {
    const row = draft.get("transactions", id);
    if (!row) continue;
    const searchText = searchTextOf(draft, row);
    if (searchText !== row.searchText) {
      draft.put("transactions", id, { ...row, searchText, updatedAt: now });
    }
  }
}

/** The Replica after a local mutation. */
export interface LocalResult {
  tables: ReplicaTables;
  changed: ChangedKeys;
  /** Accounts whose balances change, with the first day that changes. */
  accounts: Map<string, string>;
  /** The Replica lacks the rows to decide; the tables are unchanged, and the server answers. */
  waits: boolean;
}

/**
 * Applies one mutation to the Replica the way the server will, so the UI
 * shows the result before the push. Throws `MutationError` when the server
 * would reject it. When the Replica lacks the rows to decide, it changes
 * nothing and reports that the mutation waits for the server.
 */
export function applyLocalMutation(
  base: ReplicaTables,
  mutation: Mutation,
  context: LocalMutationContext,
): LocalResult {
  const draft = createTablesDraft(base);
  const written: Written = {
    transactionIds: new Set(),
    renamedPayeeIds: new Set(),
    renamedCategoryIds: new Set(),
  };
  try {
    const accounts = applyToDraft(replicaDraft(draft, written), mutation, {
      ...context,
      actor: "member",
    });
    refreshSearchText(draft, written, context.now);
    return { ...draft.finish(), accounts, waits: false };
  } catch (error) {
    if (!(error instanceof WaitForServer)) throw error;
    return {
      tables: base,
      changed: new Map(),
      accounts: new Map(),
      waits: true,
    };
  }
}
