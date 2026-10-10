import { REPLICA_TABLE_NAMES } from "../replica/replica-table-names.ts";
import type { ReplicaSnapshot } from "../replica/types.ts";

/**
 * Everything the Replica holds as one JSON document: the Household and
 * every synced table's rows, unconfirmed local changes included.
 */
export function buildReplicaExport(
  snapshot: ReplicaSnapshot,
  exportedAt: Date,
) {
  const tables: Record<string, unknown[]> = {};
  for (const table of REPLICA_TABLE_NAMES) {
    tables[table] = [...snapshot.tables[table].values()];
  }
  return {
    format: "finance-replica-export",
    version: 1,
    exportedAt: exportedAt.toISOString(),
    household: snapshot.household,
    tables,
  };
}
