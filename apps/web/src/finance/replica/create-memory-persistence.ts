import type { SyncTableName } from "../sync/row-schemas.ts";
import { createTablesDraft } from "./create-tables-draft.ts";
import { emptyReplicaTables } from "./empty-replica-tables.ts";
import { REPLICA_TABLE_NAMES } from "./replica-table-names.ts";
import { rowKey } from "./row-key.ts";
import type {
  OutboxEntry,
  ReplicaTableWrites,
  ReplicaMeta,
  ReplicaPersistence,
  ReplicaTables,
} from "./types.ts";

/**
 * Keeps the Replica in memory only: for tests, and for a browser that has no
 * IndexedDB (the Replica then lasts as long as the tab).
 */
export function createMemoryPersistence(): ReplicaPersistence {
  let meta: ReplicaMeta | null = null;
  let tables: ReplicaTables = emptyReplicaTables();
  const outbox = new Map<string, OutboxEntry>();

  return {
    load() {
      return Promise.resolve({
        meta: meta && { ...meta },
        tables,
        outbox: [...outbox.values()],
      });
    },
    loadOutbox() {
      return Promise.resolve([...outbox.values()]);
    },
    write(batch) {
      const draft = createTablesDraft(tables);
      if (batch.clearTables) draft.clear();
      const writes = batch.tables ?? {};
      const visit = <Table extends SyncTableName>(
        table: Table,
        tableWrites: ReplicaTableWrites[Table],
      ) => {
        if (!tableWrites) return;
        for (const key of tableWrites.delete) draft.remove(table, key);
        for (const row of tableWrites.put)
          draft.put(table, rowKey(table, row), row);
      };
      for (const table of REPLICA_TABLE_NAMES) visit(table, writes[table]);
      tables = draft.finish().tables;
      if (batch.meta) meta = { ...batch.meta };
      for (const entry of batch.outboxPut ?? []) {
        outbox.set(entry.mutation.id, entry);
      }
      for (const id of batch.outboxDelete ?? []) outbox.delete(id);
      return Promise.resolve();
    },
    close() {},
  };
}
