import type { TablesRelationalConfig } from "drizzle-orm";
import { NodePgSession, NodePgTransaction } from "drizzle-orm/node-postgres";
import {
  PgDialect,
  type PgDatabase,
  type PgQueryResultHKT,
  type PgTransaction,
  type PgTransactionConfig,
} from "drizzle-orm/pg-core";
import type { PoolClient } from "pg";

type Db<
  TFullSchema extends Record<string, unknown>,
  TSchema extends TablesRelationalConfig,
> = PgDatabase<PgQueryResultHKT, TFullSchema, TSchema>;

type Transaction<
  TFullSchema extends Record<string, unknown>,
  TSchema extends TablesRelationalConfig,
> = PgTransaction<PgQueryResultHKT, TFullSchema, TSchema>;

interface ClientPool {
  connect: () => Promise<PoolClient>;
}

/** A pg Pool, by its shape: a client of the pool also has `connect`, but no `totalCount`. */
function isPool(client: unknown): client is ClientPool {
  return (
    typeof client === "object" &&
    client !== null &&
    typeof Reflect.get(client, "connect") === "function" &&
    typeof Reflect.get(client, "totalCount") === "number"
  );
}

/** The pg Pool under `db`, or null for another driver or a transaction. */
function poolOf(db: object): ClientPool | null {
  const client: unknown = Reflect.get(db, "$client");
  return isPool(client) ? client : null;
}

function transactionModes(config: PgTransactionConfig | undefined) {
  const modes: string[] = [];
  if (config?.isolationLevel) {
    modes.push(`isolation level ${config.isolationLevel}`);
  }
  if (config?.accessMode) modes.push(config.accessMode);
  if (config?.deferrable === true) modes.push("deferrable");
  if (config?.deferrable === false) modes.push("not deferrable");
  return modes.map((mode) => ` ${mode}`).join("");
}

function relationsOf<
  TFullSchema extends Record<string, unknown>,
  TSchema extends TablesRelationalConfig,
>(db: Db<TFullSchema, TSchema>) {
  const { schema, fullSchema, tableNamesMap } = db._;
  return schema && { schema, fullSchema, tableNamesMap };
}

/**
 * Runs `work` in a transaction on a client of its own from the pool, in
 * place of drizzle's `db.transaction`. Every path gives the client back
 * once. The pool gets the client again only after a COMMIT or a ROLLBACK
 * that completed; after any other end, the client is closed,
 * because its connection can be broken or still in the transaction. A COMMIT
 * that the database answers with ROLLBACK throws. On another driver, such as
 * PGlite in tests, and inside a transaction, it is `db.transaction`.
 */
export async function runTransaction<
  TFullSchema extends Record<string, unknown>,
  TSchema extends TablesRelationalConfig,
  T,
>(
  db: Db<TFullSchema, TSchema>,
  work: (tx: Transaction<TFullSchema, TSchema>) => Promise<T>,
  config?: PgTransactionConfig,
): Promise<T> {
  const pool = poolOf(db);
  if (!pool) return db.transaction(work, config);

  // drizzle 0.45 sends BEGIN before its `try`, so a BEGIN that fails keeps
  // the client out of the pool. Thus this sends BEGIN, COMMIT and ROLLBACK
  // itself.
  const client = await pool.connect();
  let isClean = false;
  try {
    const dialect = new PgDialect();
    const relations = relationsOf(db);
    const tx: Transaction<TFullSchema, TSchema> = new NodePgTransaction<
      TFullSchema,
      TSchema
    >(dialect, new NodePgSession(client, dialect, relations), relations);
    await client.query(`begin${transactionModes(config)}`);
    let result: T;
    try {
      result = await work(tx);
    } catch (error) {
      await client.query("rollback").then(
        () => {
          isClean = true;
        },
        () => undefined,
      );
      throw error;
    }
    const commit = await client.query("commit");
    isClean = true;
    if (commit.command === "ROLLBACK") {
      throw new Error(
        "A statement in this transaction failed, so the database rolled the transaction back at its COMMIT. Do not catch the error of a statement inside a transaction; to go on after it, run the statement in a savepoint (`tx.transaction`).",
      );
    }
    return result;
  } finally {
    client.release(
      isClean ? undefined : new Error("A transaction did not end cleanly."),
    );
  }
}
