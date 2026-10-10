import type { SyncTableName } from "../sync/row-schemas.ts";
import type { ReplicaRow } from "./types.ts";

/**
 * The key of a row in its table. Tables without an `id` join the fields of
 * their primary key with `|`; the Household is implied.
 */
export function rowKey<Table extends SyncTableName>(
  table: Table,
  row: ReplicaRow<Table>,
): string {
  if ("id" in row) return row.id;
  if ("alias" in row) return row.alias;
  if ("tagId" in row) return `${row.transactionId}|${row.tagId}`;
  if ("balanceMinor" in row) return `${row.accountId}|${row.day}`;
  if ("month" in row) {
    return `${row.month}|${row.kind}|${row.categoryId}|${row.memberId ?? ""}`;
  }
  if ("quote" in row) return `${row.base}|${row.quote}|${row.on}`;
  throw new Error(`No key for a row of ${table}`);
}
