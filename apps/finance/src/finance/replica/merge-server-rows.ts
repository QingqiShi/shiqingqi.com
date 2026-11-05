import {
  SYNC_TABLE_NAMES,
  type SyncRows,
  type SyncTableName,
} from "../sync/row-schemas.ts";
import type { ChangedKeys, TablesDraft } from "./create-tables-draft.ts";
import { rowKey } from "./row-key.ts";
import type { ReplicaRow, ReplicaTableWrites } from "./types.ts";

/** Derived tables: their deleted rows carry nothing a screen needs, so the Replica drops them. */
const DROP_DELETED = new Set<SyncTableName>(["accountBalanceDays"]);

export function writesOf(tables: TablesDraft, changed: ChangedKeys) {
  const writes: ReplicaTableWrites = {};
  for (const table of SYNC_TABLE_NAMES) {
    const keys = changed.get(table);
    if (!keys) continue;
    const put: ReplicaRow<SyncTableName>[] = [];
    const remove: string[] = [];
    for (const key of keys) {
      const row = tables.get(table, key);
      if (row) put.push(row);
      else remove.push(key);
    }
    Object.assign(writes, { [table]: { put, delete: remove } });
  }
  return writes;
}

function isDeletedRow(row: object) {
  return "deletedAt" in row && row.deletedAt !== null;
}

/** Returns the keys it changed. */
export function mergeServerRows(draft: TablesDraft, tables: Partial<SyncRows>) {
  const changed: ChangedKeys = new Map();
  for (const table of SYNC_TABLE_NAMES) {
    const rows: readonly ReplicaRow<SyncTableName>[] | undefined =
      tables[table];
    if (!rows) continue;
    const keys = new Set<string>();
    for (const row of rows) {
      const key = rowKey(table, row);
      if (!DROP_DELETED.has(table) || !isDeletedRow(row)) {
        draft.put(table, key, row);
        keys.add(key);
      } else if (draft.remove(table, key)) {
        keys.add(key);
      }
    }
    if (keys.size > 0) changed.set(table, keys);
  }
  return changed;
}
