import { MutationError } from "../sync/mutation-error.ts";
import {
  applyLocalMutation,
  type LocalMutationContext,
} from "./apply-local-mutation.ts";
import type { ChangedKeys } from "./create-tables-draft.ts";
import type { OutboxEntry, ReplicaTables } from "./types.ts";

interface ReplayResult {
  tables: ReplicaTables;
  /** Every row a replayed mutation wrote, per table. */
  changed: ChangedKeys;
  /** Accounts whose balances the replayed mutations change, with the first day. */
  accounts: Map<string, string>;
  /** Mutations the server will reject too; they changed nothing. */
  failed: { entry: OutboxEntry; error: MutationError }[];
}

export function mergeChangedKeys(into: ChangedKeys, from: ChangedKeys) {
  for (const [table, keys] of from) {
    const existing = into.get(table);
    if (existing) for (const key of keys) existing.add(key);
    else into.set(table, new Set(keys));
  }
}

export function mergeAccountDays(
  into: Map<string, string>,
  from: ReadonlyMap<string, string>,
) {
  for (const [accountId, day] of from) {
    const previous = into.get(accountId);
    if (previous === undefined || day < previous) into.set(accountId, day);
  }
}

/**
 * Applies the mutations no pull has confirmed yet on top of the server rows,
 * in order. Each one is all or nothing: a mutation the server would reject
 * is skipped and reported, and one only the server can decide is skipped.
 */
export function replayOutbox(
  base: ReplicaTables,
  entries: readonly OutboxEntry[],
  contextOf: (entry: OutboxEntry) => LocalMutationContext,
): ReplayResult {
  let tables = base;
  const changed: ChangedKeys = new Map();
  const accounts = new Map<string, string>();
  const failed: ReplayResult["failed"] = [];
  for (const entry of entries) {
    try {
      const result = applyLocalMutation(
        tables,
        entry.mutation,
        contextOf(entry),
      );
      tables = result.tables;
      mergeChangedKeys(changed, result.changed);
      mergeAccountDays(accounts, result.accounts);
    } catch (error) {
      if (!(error instanceof MutationError)) throw error;
      failed.push({ entry, error });
    }
  }
  return { tables, changed, accounts, failed };
}
