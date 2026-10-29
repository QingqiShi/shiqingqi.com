import { sql } from "drizzle-orm";
import type { PgTransactionConfig } from "drizzle-orm/pg-core";
import type { RepositoryScope } from "./repositories/types.ts";
import type { FinanceDb } from "./types.ts";

const financeApp: unique symbol = Symbol("finance_app");
const household: unique symbol = Symbol("household");

/**
 * A transaction that runs as the `finance_app` role: it reaches the global
 * tables (users, passkeys, sessions) and the lookups that run before a
 * Household is known, and row level security limits every Household table
 * to the Household in `app.household_id`. Only `asFinanceApp` and
 * `withHousehold` make one.
 */
export type FinanceAppDb = FinanceDb & { readonly [financeApp]: true };

/** A `FinanceAppDb` with `app.household_id` set: every statement in it reaches one Household only. */
export type HouseholdDb = FinanceAppDb & { readonly [household]: true };

function markHousehold(tx: FinanceDb): HouseholdDb {
  return Object.assign(tx, {
    [financeApp]: true as const,
    [household]: true as const,
  });
}

/**
 * Runs `run` in a transaction as `finance_app`. Both settings are `local`,
 * the one form that is safe behind a connection pooler and the PGlite wire
 * server: they end with the transaction and never reach another client.
 */
export function asFinanceApp<T>(
  db: FinanceDb,
  run: (db: FinanceAppDb) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql.raw("set local role finance_app"));
    return run(Object.assign(tx, { [financeApp]: true as const }));
  });
}

/**
 * Runs `run` in a transaction as `finance_app` scoped to one Household. The
 * Household comes from the session or a cron, never from a request body.
 * Inside an open `FinanceAppDb` it is a savepoint that sets the Household
 * for the rest of the outer transaction.
 */
export function withHousehold<T>(
  db: FinanceDb,
  householdId: string,
  run: (scope: RepositoryScope) => Promise<T>,
  config?: PgTransactionConfig,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('role', 'finance_app', true), set_config('app.household_id', ${householdId}, true)`,
    );
    return run({ db: markHousehold(tx), householdId });
  }, config);
}

/** Runs `run` in a savepoint of the scope's transaction, so that its writes roll back on their own. */
export function withSavepoint<Scope extends RepositoryScope, T>(
  scope: Scope,
  run: (scope: Scope) => Promise<T>,
): Promise<T> {
  return scope.db.transaction((tx) => run({ ...scope, db: markHousehold(tx) }));
}
