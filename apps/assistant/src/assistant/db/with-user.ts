import { sql } from "drizzle-orm";
import type { PgTransactionConfig } from "drizzle-orm/pg-core";
import type { AssistantDb } from "./types.ts";

const assistantApp: unique symbol = Symbol("assistant_app");
const user: unique symbol = Symbol("user");

/**
 * A transaction that runs as the `assistant_app` role: it reaches the global
 * tables (users, passkeys, sessions, invites), and row level security limits
 * every user table to the user in `app.user_id`. Only `asAssistantApp` and
 * `withUser` make one.
 */
export type AssistantAppDb = AssistantDb & { readonly [assistantApp]: true };

/** An `AssistantAppDb` with `app.user_id` set: every statement on a user table reaches one user only. */
export type UserDb = AssistantAppDb & { readonly [user]: true };

/** What a function that reads or writes one user's rows takes. */
export interface UserScope {
  db: UserDb;
  userId: string;
}

/**
 * Runs `run` in a transaction as `assistant_app`, with no user. Both
 * settings are `local`, the one form that is safe behind a connection pooler
 * and the PGlite wire server: they end with the transaction.
 */
export function asAssistantApp<T>(
  db: AssistantDb,
  run: (db: AssistantAppDb) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql.raw("set local role assistant_app"));
    return run(Object.assign(tx, { [assistantApp]: true as const }));
  });
}

/**
 * Runs `run` in a transaction as `assistant_app` scoped to one user. The
 * user comes from the session or a cron, never from a request body.
 */
export function withUser<T>(
  db: AssistantDb,
  userId: string,
  run: (scope: UserScope) => Promise<T>,
  config?: PgTransactionConfig,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('role', 'assistant_app', true), set_config('app.user_id', ${userId}, true)`,
    );
    const scoped = Object.assign(tx, {
      [assistantApp]: true as const,
      [user]: true as const,
    });
    return run({ db: scoped, userId });
  }, config);
}

/**
 * Runs `run` in a savepoint of a user's transaction: when it fails, only its
 * own writes roll back, and the transaction can go on.
 */
export function inSavepoint<T>(
  db: UserDb,
  run: (db: UserDb) => Promise<T>,
): Promise<T> {
  return db.transaction((tx) =>
    run(
      Object.assign(tx, {
        [assistantApp]: true as const,
        [user]: true as const,
      }),
    ),
  );
}
