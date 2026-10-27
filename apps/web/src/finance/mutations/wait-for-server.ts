import type { MutationError } from "../sync/mutation-error.ts";
import type { SyncTableName } from "../sync/row-schemas.ts";
import type { MutationDraft } from "./types.ts";

/**
 * The Replica lacks the rows to decide a mutation, for example a Transaction
 * deleted before its bootstrap. The mutation goes to the server, and the
 * Replica shows its result only when the server answers.
 */
export class WaitForServer extends Error {
  constructor() {
    super("The server decides this mutation");
    this.name = "WaitForServer";
  }
}

/** Throws `error`, or waits for the server when the row may be one the draft does not hold. */
export function absent(
  draft: MutationDraft,
  table: SyncTableName,
  error: MutationError,
): never {
  if (draft.mayLack(table)) throw new WaitForServer();
  throw error;
}
