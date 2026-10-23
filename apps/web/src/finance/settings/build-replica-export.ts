import type { ReplicaSnapshot } from "../replica/types.ts";
import { SYNC_TABLE_NAMES } from "../sync/row-schemas.ts";

/**
 * Everything the Replica holds as one JSON document: the Household, every
 * synced table's rows, unconfirmed local changes included, and the
 * exchange rates.
 */
export function buildReplicaExport(
  snapshot: ReplicaSnapshot,
  exportedAt: Date,
) {
  const tables: Record<string, unknown[]> = {};
  for (const table of SYNC_TABLE_NAMES) {
    tables[table] = [...snapshot.tables[table].values()];
  }
  return {
    format: "finance-replica-export",
    version: 1,
    exportedAt: exportedAt.toISOString(),
    household: snapshot.household,
    tables,
    exchangeRates: [...snapshot.exchangeRates.values()],
  };
}
