import type { FinanceDb } from "../types.ts";

/**
 * The Household a repository function reads or writes. `db` is the database
 * or an open transaction. The Household comes from the session, never from a
 * request body.
 */
export interface RepositoryScope {
  db: FinanceDb;
  householdId: string;
}

/** A scope inside a write: every row it touches gets `version`. */
export interface WriteScope extends RepositoryScope {
  version: number;
}
