import type { ReplicaSnapshot } from "../replica/types.ts";
import type { SyncTableName } from "../sync/row-schemas.ts";

/** True while a local change to the row waits for the server to confirm it. */
export function isRowPending(
  snapshot: ReplicaSnapshot,
  table: SyncTableName,
  key: string,
) {
  return snapshot.pendingKeys.has(`${table}:${key}`);
}
