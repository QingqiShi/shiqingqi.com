import type { SyncTableName } from "../sync/row-schemas.ts";
import type { ReplicaRow, ReplicaTables } from "./types.ts";

type WritableTables = {
  [Table in SyncTableName]?: Map<string, ReplicaRow<Table>>;
};

export type ChangedKeys = Map<SyncTableName, Set<string>>;

/**
 * A copy-on-write view of the Replica's tables: a table is copied the first
 * time it is written, so a change to one row costs one map copy, and every
 * table that did not change keeps its map.
 */
export function createTablesDraft(base: ReplicaTables) {
  const copies: WritableTables = {};
  const changed: ChangedKeys = new Map();

  function read<Table extends SyncTableName>(
    table: Table,
  ): ReadonlyMap<string, ReplicaRow<Table>> {
    return copies[table] ?? base[table];
  }

  function write<Table extends SyncTableName>(
    table: Table,
  ): Map<string, ReplicaRow<Table>> {
    const existing = copies[table];
    if (existing) return existing;
    const copy = new Map(base[table]);
    // TypeScript cannot check a write through a generic key. Object.assign
    // with a computed key does the write without a type assertion.
    Object.assign(copies, { [table]: copy });
    return copy;
  }

  function markChanged(table: SyncTableName, key: string) {
    const keys = changed.get(table);
    if (keys) keys.add(key);
    else changed.set(table, new Set([key]));
  }

  return {
    get<Table extends SyncTableName>(table: Table, key: string) {
      return read(table).get(key);
    },
    values<Table extends SyncTableName>(table: Table) {
      return read(table).values();
    },
    put<Table extends SyncTableName>(
      table: Table,
      key: string,
      row: ReplicaRow<Table>,
    ) {
      write(table).set(key, row);
      markChanged(table, key);
    },
    /** Returns false when the row was not there. */
    remove(table: SyncTableName, key: string) {
      if (!read(table).has(key)) return false;
      write(table).delete(key);
      markChanged(table, key);
      return true;
    },
    /** Drops every row of every table. */
    clear() {
      for (const table of Object.keys(base)) {
        if (!isTableOf(base, table)) continue;
        for (const key of read(table).keys()) markChanged(table, key);
        Object.assign(copies, { [table]: new Map() });
      }
    },
    finish(): { tables: ReplicaTables; changed: ChangedKeys } {
      return { tables: { ...base, ...copies }, changed };
    },
  };
}

function isTableOf(tables: ReplicaTables, name: string): name is SyncTableName {
  return name in tables;
}

export type TablesDraft = ReturnType<typeof createTablesDraft>;
