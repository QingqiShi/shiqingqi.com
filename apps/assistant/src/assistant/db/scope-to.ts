import { AsyncLocalStorage } from "node:async_hooks";
import { sql, type Query, type SQL } from "drizzle-orm";
import { NodePgDatabase, NodePgSession } from "drizzle-orm/node-postgres";
import {
  PgDatabase,
  PgDialect,
  PgPreparedQuery,
  PgSession,
  type PgQueryResultHKT,
  type PgTransaction,
  type PgTransactionConfig,
  type PreparedQueryConfig,
} from "drizzle-orm/pg-core";
import { Pool, type PoolClient } from "pg";
import { z } from "zod";
import type { schema } from "./schema.ts";
import type { AssistantDb } from "./types.ts";

type FullSchema = typeof schema;
type Tables = AssistantDb["_"]["schema"] & object;
type Transaction = PgTransaction<PgQueryResultHKT, FullSchema, Tables>;
type Work<T> = (tx: Transaction) => Promise<T>;

const userScopeMark: unique symbol = Symbol("user scope");

/**
 * One user's way into the database. Every statement through `db` runs as the
 * role `assistant_app` with `assistant.user_id` set to `userId`, so row-level
 * security gives it that user's rows only. Only `scopeTo` makes one.
 */
export interface UserScope {
  readonly db: AssistantDb;
  readonly userId: string;
  readonly [userScopeMark]: true;
}

const userIdSchema = z.guid();

/** The scoped transaction that the code in it runs in, until it ends. */
interface OpenTransaction {
  owner: AssistantDb;
  userId: string | null;
  tx: Transaction;
  ended: boolean;
}

const openTransactions = new AsyncLocalStorage<OpenTransaction>();

class ScopeEndedError extends Error {
  constructor() {
    super(
      "This transaction of a user scope has ended. Await each query inside the transaction, and do not keep a transaction past its end.",
    );
  }
}

/**
 * The client of one scoped transaction. Every use after the transaction
 * fails, so that a transaction, savepoint or query kept past the end cannot
 * run on the pool's next transaction as the owner.
 */
function closableClient(client: PoolClient) {
  let ended = false;
  const guarded = new Proxy(client, {
    get(target, key) {
      if (ended) throw new ScopeEndedError();
      const value: unknown = Reflect.get(target, key, target);
      if (typeof value !== "function") return value;
      const bound: unknown = value.bind(target);
      return bound;
    },
  });
  return {
    guarded,
    end: () => {
      ended = true;
    },
  };
}

/**
 * Runs `work` in a transaction on a client of its own. Every path gives the
 * client back. The pool gets the client again only after a commit or a
 * rollback that completed. After any other failure, such as a failed `BEGIN`,
 * `COMMIT` or `ROLLBACK`, the client is closed, because its connection can be
 * broken or still in the transaction.
 */
async function onOwnClient<T>(
  owner: AssistantDb,
  pool: Pool,
  work: Work<T>,
  config?: PgTransactionConfig,
): Promise<T> {
  const client = await pool.connect();
  const { guarded, end } = closableClient(client);
  const errorsOfWork = new Set<unknown>();
  let broken: Error | undefined;
  try {
    const dialect = new PgDialect();
    const { schema: tables, fullSchema, tableNamesMap } = owner._;
    const relations = tables && { schema: tables, fullSchema, tableNamesMap };
    const db = new NodePgDatabase(
      dialect,
      new NodePgSession(guarded, dialect, relations),
      relations,
    );
    return await db.transaction(async (tx) => {
      try {
        return await work(tx);
      } catch (error) {
        errorsOfWork.add(error);
        throw error;
      }
    }, config);
  } catch (error) {
    // Drizzle throws the error of `work` only when its rollback completed.
    if (!errorsOfWork.has(error)) {
      broken = error instanceof Error ? error : new Error(String(error));
    }
    throw error;
  } finally {
    end();
    client.release(broken);
  }
}

/** A transaction of the owner's driver. PGlite has one connection and closes a transaction's handle at its end. */
function inTransaction<T>(
  owner: AssistantDb,
  work: Work<T>,
  config?: PgTransactionConfig,
): Promise<T> {
  const client: unknown = Reflect.get(owner, "$client");
  return client instanceof Pool
    ? onOwnClient(owner, client, work, config)
    : owner.transaction(work, config);
}

/**
 * Runs each statement and transaction as `assistant_app`, with the user id
 * set or empty. Both settings end with the transaction, so they never reach
 * another request on a pooled connection. A statement or transaction of the
 * same scope inside a scoped transaction runs in that transaction, on its
 * connection.
 */
class ScopeRunner {
  readonly #owner: AssistantDb;
  readonly #userId: string | null;

  constructor(owner: AssistantDb, userId: string | null) {
    this.#owner = owner;
    this.#userId = userId;
  }

  #open(): OpenTransaction | null {
    const open = openTransactions.getStore();
    if (!open || open.ended) return null;
    if (open.owner !== this.#owner || open.userId !== this.#userId) {
      throw new Error(
        "A user scope ran a query inside a transaction of another scope, which needs a second connection. End that transaction first.",
      );
    }
    return open;
  }

  #begin<T>(work: Work<T>, config?: PgTransactionConfig): Promise<T> {
    return inTransaction(
      this.#owner,
      async (tx) => {
        await tx.execute(
          sql`select set_config('role', 'assistant_app', true), set_config('assistant.user_id', ${this.#userId ?? ""}, true)`,
        );
        const open: OpenTransaction = {
          owner: this.#owner,
          userId: this.#userId,
          tx,
          ended: false,
        };
        try {
          return await openTransactions.run(open, () => work(tx));
        } finally {
          open.ended = true;
        }
      },
      config,
    );
  }

  async statement<T>(work: Work<T>): Promise<T> {
    const open = this.#open();
    return open ? work(open.tx) : this.#begin(work);
  }

  async transaction<T>(
    work: Work<T>,
    config?: PgTransactionConfig,
  ): Promise<T> {
    const open = this.#open();
    return open ? open.tx.transaction(work) : this.#begin(work, config);
  }
}

class ScopedPreparedQuery<
  T extends PreparedQueryConfig,
> extends PgPreparedQuery<T> {
  readonly #prepare: (tx: Transaction) => PgPreparedQuery<T>;
  readonly #runner: ScopeRunner;
  readonly #arrayMode: boolean;

  constructor(
    query: Query,
    prepare: (tx: Transaction) => PgPreparedQuery<T>,
    runner: ScopeRunner,
    arrayMode: boolean,
  ) {
    super(query, undefined, undefined);
    this.#prepare = prepare;
    this.#runner = runner;
    this.#arrayMode = arrayMode;
  }

  #prepareIn(tx: Transaction) {
    const prepared = this.#prepare(tx);
    // A select sets this after `prepareQuery`, so it must go to the query
    // that runs. Without it, a left join gives a row of nulls, not null.
    Reflect.set(
      prepared,
      "joinsNotNullableMap",
      Reflect.get(this, "joinsNotNullableMap"),
    );
    return prepared;
  }

  execute(placeholderValues?: Record<string, unknown>) {
    return this.#runner.statement((tx) =>
      this.#prepareIn(tx).execute(placeholderValues),
    );
  }

  isResponseInArrayMode() {
    return this.#arrayMode;
  }
}

/**
 * A drizzle session that runs each statement in its own transaction as
 * `assistant_app`, and each drizzle transaction as one such transaction.
 */
class ScopedSession extends PgSession<PgQueryResultHKT, FullSchema, Tables> {
  readonly #runner: ScopeRunner;

  constructor(dialect: PgDialect, runner: ScopeRunner) {
    super(dialect);
    this.#runner = runner;
  }

  prepareQuery<T extends PreparedQueryConfig = PreparedQueryConfig>(
    ...args: Parameters<PgSession["prepareQuery"]>
  ): PgPreparedQuery<T> {
    return new ScopedPreparedQuery<T>(
      args[0],
      (tx) => tx._.session.prepareQuery<T>(...args),
      this.#runner,
      args[3],
    );
  }

  execute<T>(query: SQL): Promise<T> {
    return this.#runner.statement((tx) => tx._.session.execute<T>(query));
  }

  all<T = unknown>(query: SQL): Promise<T[]> {
    return this.#runner.statement((tx) => tx._.session.all<T>(query));
  }

  count(query: SQL): Promise<number> {
    return this.#runner.statement((tx) => tx._.session.count(query));
  }

  transaction<T>(
    transaction: Work<T>,
    config?: PgTransactionConfig,
  ): Promise<T> {
    return this.#runner.transaction(transaction, config);
  }
}

function limitedDb(owner: AssistantDb, userId: string | null): AssistantDb {
  const session = new ScopedSession(
    new PgDialect(),
    new ScopeRunner(owner, userId),
  );
  const { schema: tables, fullSchema, tableNamesMap } = owner._;
  return new PgDatabase<PgQueryResultHKT, FullSchema, Tables>(
    new PgDialect(),
    session,
    tables && { schema: tables, fullSchema, tableNamesMap },
  );
}

/**
 * The scope of one user. `userId` must come from the session, a cron's list
 * of users or a token that proves the user, never from a request.
 */
export function scopeTo(owner: AssistantDb, userId: string): UserScope {
  if (!userIdSchema.safeParse(userId).success) {
    throw new Error("A user scope needs a user id.");
  }
  return {
    db: limitedDb(owner, userId),
    userId,
    [userScopeMark]: true,
  };
}

/**
 * `assistant_app` with no user: row-level security gives it no row. It can
 * only call the functions that cross users, for a step that must find its
 * user first.
 */
export function withoutUser(owner: AssistantDb): AssistantDb {
  return limitedDb(owner, null);
}
