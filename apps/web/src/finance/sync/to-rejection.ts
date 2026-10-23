import { findPostgresError } from "#src/finance/db/find-postgres-error.ts";
import { MutationError } from "./mutation-error.ts";
import type { Rejection } from "./types.ts";

/**
 * PostgreSQL error classes that say the server or the connection failed, not
 * the mutation: 08 connection, 40 transaction rollback (serialisation,
 * deadlock), 53 insufficient resources, 57 operator intervention (for
 * example a statement timeout), 58 system error.
 */
const SERVER_ERROR_CLASSES = new Set(["08", "40", "53", "57", "58"]);

/**
 * Migrations run before the new code serves, so for a short time the old
 * code meets a schema it does not know: a column or table it writes is gone
 * (42703, 42P01), or a migration holds a lock past the lock timeout
 * (55P03). The push must try again. The other codes of class 42 and 55 do
 * not go away on their own, so they reject the mutation; if not, it blocks
 * the Outbox.
 */
const SCHEMA_CHANGE_CODES = new Set(["42703", "42P01", "55P03"]);

/** A rejection for errors a mutation can cause; undefined for any other error. */
export function toRejection(id: string, error: unknown): Rejection | undefined {
  if (error instanceof MutationError) {
    return { id, reason: error.reason, message: error.message };
  }
  const code = findPostgresError(error)?.code;
  if (
    code === undefined ||
    code.length !== 5 ||
    SERVER_ERROR_CLASSES.has(code.slice(0, 2)) ||
    SCHEMA_CHANGE_CODES.has(code)
  ) {
    return undefined;
  }
  // The database refused the data of this mutation, for example a duplicate
  // name (class 23) or a number out of range (class 22). The same push fails
  // each time, so reject it. If not, it blocks the Outbox of the device.
  return {
    id,
    reason: "invalid",
    message: error instanceof Error ? error.message : undefined,
  };
}
