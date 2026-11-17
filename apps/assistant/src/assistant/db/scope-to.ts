import { AsyncLocalStorage } from "node:async_hooks";
import { sql, type Query, type SQL } from "drizzle-orm";
import { NodePgSession } from "drizzle-orm/node-postgres";
import {
  PgDatabase,
  PgDialect,
  PgPreparedQuery,
  PgSession,
  PgTransaction,
  type PgQueryResultHKT,
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
type DriverSession = PgSession<PgQueryResultHKT, FullSchema, Tables>;

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

function relationsOf(owner: AssistantDb) {
  const { schema: tables, fullSchema, tableNamesMap } = owner._;
  return tables && { schema: tables, fullSchema, tableNamesMap };
}

class ScopeEndedError extends Error {
  constructor() {
    super(
      "This transaction of a user scope has ended. Await each query inside the transaction, and do not keep a transaction past its end.",
    );
  }
}

/**
 * The client of one scoped transaction, as drizzle sees it. It sends the
 * queries one after another, because `pg` must not get a query while one
 * runs. When the work of the transaction ends, it takes no more queries, so
 * that only the COMMIT or ROLLBACK on the raw client follows.
 */
class SerialClient {
  readonly guarded: PoolClient;
  #isClosed = false;
  #last: Promise<unknown> = Promise.resolve();

  constructor(client: PoolClient) {
    const query: unknown = Reflect.get(client, "query");
    if (typeof query !== "function")
      throw new Error("A pg client has no query.");
    const send = (...args: unknown[]): Promise<unknown> => {
      if (this.#isClosed) return Promise.reject(new ScopeEndedError());
      const sent = this.#last.then((): unknown =>
        Reflect.apply(query, client, args),
      );
      this.#last = sent.then(
        () => undefined,
        () => undefined,
      );
      return sent;
    };
    this.guarded = new Proxy(client, {
      get: (target, key) => {
        if (this.#isClosed) throw new ScopeEndedError();
        if (key === "query") return send;
        const value: unknown = Reflect.get(target, key, target);
        if (typeof value !== "function") return value;
        const bound: unknown = value.bind(target);
        return bound;
      },
    });
  }

  /** Takes no more queries, and waits for those that it took. */
  async close() {
    this.#isClosed = true;
    await this.#last;
  }
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

/**
 * Runs `run` in a transaction on a client of its own. Every path gives the
 * client back once. The pool gets the client again only after a COMMIT or a
 * ROLLBACK that completed; after any other end, the client is closed, because
 * its connection can be broken or still in the transaction.
 */
async function onOwnClient<T>(
  owner: AssistantDb,
  pool: Pool,
  run: (session: DriverSession) => Promise<T>,
  config: PgTransactionConfig | undefined,
): Promise<T> {
  const client = await pool.connect();
  const serial = new SerialClient(client);
  let isClean = false;
  try {
    await client.query(`begin${transactionModes(config)}`);
    let result: T;
    try {
      result = await run(
        new NodePgSession<FullSchema, Tables>(
          serial.guarded,
          new PgDialect(),
          relationsOf(owner),
        ),
      );
    } catch (error) {
      await serial.close();
      await client.query("rollback").then(
        () => {
          isClean = true;
        },
        () => undefined,
      );
      throw error;
    }
    await serial.close();
    const commit = await client.query("commit");
    isClean = true;
    if (commit.command === "ROLLBACK") {
      throw new Error(
        "A statement in this transaction of a user scope failed, so the database rolled the transaction back at its COMMIT. Do not catch the error of a statement inside a transaction; to go on after it, run the statement in a savepoint (`tx.transaction`).",
      );
    }
    return result;
  } finally {
    client.release(
      isClean
        ? undefined
        : new Error("A transaction of a user scope did not end cleanly."),
    );
  }
}

/**
 * The open transaction and savepoints of one scoped transaction, the
 * transaction first. Each savepoint has its own name, because Postgres keeps
 * a savepoint after ROLLBACK TO, and a second savepoint of the same name
 * hides the first.
 */
class TransactionLine {
  readonly owner: AssistantDb;
  readonly userId: string | null;
  readonly session: DriverSession;
  readonly open: ScopeTransaction[] = [];
  #savepoints = 0;

  constructor(
    owner: AssistantDb,
    userId: string | null,
    session: DriverSession,
  ) {
    this.owner = owner;
    this.userId = userId;
    this.session = session;
  }

  start() {
    const tx = new ScopeTransaction(this, null);
    this.open.push(tx);
    return tx;
  }

  async savepoint<T>(parent: ScopeTransaction, work: Work<T>): Promise<T> {
    if (parent.ended || this.open.at(-1) !== parent) {
      throw new Error(
        "A savepoint of a user scope must start in the innermost open transaction or savepoint. Await each savepoint before you start the next.",
      );
    }
    this.#savepoints += 1;
    const name = `scope_savepoint_${String(this.#savepoints)}`;
    const inner = new ScopeTransaction(this, parent);
    this.open.push(inner);
    try {
      await this.session.execute(sql.raw(`savepoint ${name}`));
      try {
        const result = await openTransactions.run(inner, () => work(inner));
        await this.session.execute(sql.raw(`release savepoint ${name}`));
        return result;
      } catch (error) {
        await this.session.execute(sql.raw(`rollback to savepoint ${name}`));
        throw error;
      }
    } finally {
      this.end(inner);
    }
  }

  /** Ends `tx` and the savepoints in it. */
  end(tx: ScopeTransaction) {
    const at = this.open.indexOf(tx);
    if (at === -1) return;
    for (const ended of this.open.splice(at)) ended.ended = true;
  }
}

/** A scoped transaction or a savepoint in it, as drizzle's `tx`. */
class ScopeTransaction extends PgTransaction<
  PgQueryResultHKT,
  FullSchema,
  Tables
> {
  readonly line: TransactionLine;
  readonly parent: ScopeTransaction | null;
  ended = false;

  constructor(line: TransactionLine, parent: ScopeTransaction | null) {
    super(new PgDialect(), line.session, relationsOf(line.owner));
    this.line = line;
    this.parent = parent;
  }

  transaction<T>(work: Work<T>): Promise<T> {
    return this.line.savepoint(this, work);
  }
}

/** The innermost scoped transaction or savepoint that the code runs in. */
const openTransactions = new AsyncLocalStorage<ScopeTransaction>();

function inTransaction<T>(
  owner: AssistantDb,
  run: (session: DriverSession) => Promise<T>,
  config: PgTransactionConfig | undefined,
): Promise<T> {
  const client: unknown = Reflect.get(owner, "$client");
  if (!(client instanceof Pool)) {
    return Promise.reject(
      new Error(
        "A user scope needs an owner on a pg Pool, because it runs each transaction on a client of its own.",
      ),
    );
  }
  return onOwnClient(owner, client, run, config);
}

/**
 * Runs each statement and transaction as `assistant_app`, with the user id
 * set or empty. Both settings end with the transaction, so they never reach
 * another request on a pooled connection. A statement of the same scope
 * inside a scoped transaction runs in it, and a transaction of the same scope
 * inside it is a savepoint.
 */
class ScopeRunner {
  readonly #owner: AssistantDb;
  readonly #userId: string | null;

  constructor(owner: AssistantDb, userId: string | null) {
    this.#owner = owner;
    this.#userId = userId;
  }

  #open(): ScopeTransaction | null {
    let open = openTransactions.getStore() ?? null;
    while (open?.ended) open = open.parent;
    if (!open) return null;
    if (open.line.owner !== this.#owner || open.line.userId !== this.#userId) {
      throw new Error(
        "A user scope ran a query inside a transaction of another scope, which needs a second connection. End that transaction first.",
      );
    }
    return open;
  }

  #begin<T>(work: Work<T>, config?: PgTransactionConfig): Promise<T> {
    return inTransaction(
      this.#owner,
      async (session) => {
        const line = new TransactionLine(this.#owner, this.#userId, session);
        const tx = line.start();
        try {
          await tx.execute(
            sql`select set_config('role', 'assistant_app', true), set_config('assistant.user_id', ${this.#userId ?? ""}, true)`,
          );
          return await openTransactions.run(tx, () => work(tx));
        } finally {
          line.end(tx);
        }
      },
      config,
    );
  }

  async statement<T>(work: Work<T>): Promise<T> {
    const open = this.#open();
    return open ? work(open) : this.#begin(work);
  }

  async transaction<T>(
    work: Work<T>,
    config?: PgTransactionConfig,
  ): Promise<T> {
    const open = this.#open();
    return open ? open.transaction(work) : this.#begin(work, config);
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
  return new PgDatabase<PgQueryResultHKT, FullSchema, Tables>(
    new PgDialect(),
    session,
    relationsOf(owner),
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
