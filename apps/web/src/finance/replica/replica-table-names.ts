import { rowSchemas, type SyncTableName } from "../sync/row-schemas.ts";

function isSyncTableName(name: string): name is SyncTableName {
  return name in rowSchemas;
}

/** Every synced table, in the order the server sends them. */
export const REPLICA_TABLE_NAMES: readonly SyncTableName[] =
  Object.keys(rowSchemas).filter(isSyncTableName);
