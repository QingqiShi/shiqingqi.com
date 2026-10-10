import type { HouseholdDb } from "../with-household.ts";

/**
 * The Household a repository function reads or writes. `db` is the
 * transaction that `withHousehold` opened for that Household, so a
 * repository cannot run outside one. The Household comes from the session,
 * never from a request body.
 */
export interface RepositoryScope {
  db: HouseholdDb;
  householdId: string;
}

/** A scope inside a write: every row it touches gets `version`. */
export interface WriteScope extends RepositoryScope {
  version: number;
}
