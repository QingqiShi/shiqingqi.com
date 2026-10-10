import { MutationError } from "./mutation-error.ts";
import type { Rejection } from "./types.ts";

const MAX_CAUSE_DEPTH = 5;

function errorCode(error: unknown): string | undefined {
  let cause = error;
  for (let depth = 0; depth < MAX_CAUSE_DEPTH; depth++) {
    if (typeof cause !== "object" || cause === null) return undefined;
    if ("code" in cause && typeof cause.code === "string") return cause.code;
    cause = "cause" in cause ? cause.cause : undefined;
  }
  return undefined;
}

/**
 * PostgreSQL error classes that say the server or the connection failed, not
 * the mutation: 08 connection, 40 transaction rollback (serialisation,
 * deadlock), 53 insufficient resources, 57 operator intervention (for
 * example a statement timeout), 58 system error.
 */
const SERVER_ERROR_CLASSES = new Set(["08", "40", "53", "57", "58"]);

/** A rejection for errors a mutation can cause; undefined for any other error. */
export function toRejection(id: string, error: unknown): Rejection | undefined {
  if (error instanceof MutationError) {
    return { id, reason: error.reason, message: error.message };
  }
  const code = errorCode(error);
  if (
    code === undefined ||
    code.length !== 5 ||
    SERVER_ERROR_CLASSES.has(code.slice(0, 2))
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
