import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll } from "vitest";
import { z } from "zod";
import { schema } from "../schema.ts";
import type { AssistantDb } from "../types.ts";
import { loadMigratedDataDir } from "./load-migrated-data-dir.ts";

export type TestDb = AssistantDb & { close: () => Promise<void> };

/** How to put a database that a test changed back to the migrated state. */
interface ResetPlan {
  /** Counts the rows of each system catalog and finds the newest of them. */
  catalogStateSql: string;
  clearSql: string;
  /** The tables that the migrations fill, with their rows in COPY format. */
  seededTables: { name: string; rows: Blob }[];
  restoreSequencesSql: string;
}

interface PooledClient {
  client: PGlite;
  catalogState: string;
}

const nameRowsSchema = z.object({
  rows: z.array(z.object({ name: z.string() })),
});
const sqlRowsSchema = z.object({
  rows: z.array(z.object({ sql: z.string().nullable() })),
});

let migratedDataDir: Promise<Blob> | null = null;
let resetPlan: Promise<ResetPlan> | null = null;
const closedClients: PooledClient[] = [];

// The import of this module adds the hook to the test file. Without it, the
// databases that tests closed stay open after the last test.
afterAll(async () => {
  await Promise.all(
    closedClients.splice(0).map(({ client }) => client.close()),
  );
});

async function generatedSql(client: PGlite, query: string) {
  const [row] = sqlRowsSchema.parse(await client.query(query)).rows;
  return row.sql ?? "";
}

async function makeResetPlan(client: PGlite): Promise<ResetPlan> {
  const catalogStateSql = await generatedSql(
    client,
    `select string_agg(format('select %L as catalog, count(*)::text as count, max(xmin::text::bigint)::text as newest from pg_catalog.%I', relname, relname), ' union all ' order by relname) as sql
     from pg_class where relnamespace = 'pg_catalog'::regnamespace and relkind = 'r'`,
  );
  const tables = nameRowsSchema
    .parse(
      await client.query(
        `select format('%I.%I', n.nspname, c.relname) as name
         from pg_class c join pg_namespace n on n.oid = c.relnamespace
         where c.relkind = 'r'
           and n.nspname not in ('pg_catalog', 'information_schema')
           and n.nspname not like 'pg\\_toast%'
           and n.nspname not like 'pg\\_temp%'
         order by 1`,
      ),
    )
    .rows.map(({ name }) => name);
  const seededTables: ResetPlan["seededTables"] = [];
  for (const name of tables) {
    const { blob } = await client.query(`copy ${name} to '/dev/blob'`);
    if (blob && blob.size > 0) seededTables.push({ name, rows: blob });
  }
  const restoreSequencesSql = await generatedSql(
    client,
    `select string_agg(format('select setval(%L, %s, %L);', format('%I.%I', schemaname, sequencename), coalesce(last_value, start_value), last_value is not null), ' ') as sql
     from pg_sequences`,
  );
  return {
    catalogStateSql,
    // A `delete` keeps the space of the rows, and the next rows go into it.
    // Then rows that an `order by` does not separate can come back in an order
    // that is different from a new database. `truncate` gives empty tables.
    clearSql: `truncate ${tables.join(", ")};`,
    seededTables,
    restoreSequencesSql,
  };
}

async function catalogState(client: PGlite, plan: ResetPlan) {
  return JSON.stringify((await client.query(plan.catalogStateSql)).rows);
}

/**
 * Gives the data, sequences and session of the database the state of the
 * migrated database. It is false when the test changed the schema, roles or
 * another catalog, which a reset does not undo.
 */
async function reset(pooled: PooledClient, plan: ResetPlan) {
  const { client } = pooled;
  await client.exec("discard all");
  if ((await catalogState(client, plan)) !== pooled.catalogState) return false;
  // The replica role stops the triggers, which include the foreign keys. Thus
  // the order in which the tables are copied is not important.
  await client.exec(
    `begin; set local session_replication_role = replica; ${plan.clearSql}`,
  );
  for (const { name, rows } of plan.seededTables) {
    await client.query(`copy ${name} from '/dev/blob'`, [], { blob: rows });
  }
  await client.exec(`${plan.restoreSequencesSql} commit;`);
  // `truncate` changes the rows of `pg_class` that it empties.
  pooled.catalogState = await catalogState(client, plan);
  return true;
}

async function openClient(): Promise<PooledClient> {
  migratedDataDir ??= loadMigratedDataDir();
  // PGlite 0.5.10 makes `close` wait for the queries that run. A database that
  // the caller never queries does not become ready, and then `close` waits for
  // ever. `create` waits for the database to become ready.
  const client = await PGlite.create({ loadDataDir: await migratedDataDir });
  resetPlan ??= makeResetPlan(client);
  return { client, catalogState: await catalogState(client, await resetPlan) };
}

async function takeClient(): Promise<PooledClient> {
  const closed = closedClients.pop();
  const plan = await resetPlan;
  if (closed && plan) {
    const isReset = await reset(closed, plan).catch(() => false);
    if (isReset) return closed;
    await closed.client.close();
  }
  return openClient();
}

/**
 * An empty, migrated, in-memory Postgres. The first call in a test file opens
 * the cached migrated database. A later call resets a database that a test
 * closed, which is much faster than a new one.
 */
export async function createTestDb(): Promise<TestDb> {
  const pooled = await takeClient();
  // A query after `close` must fail as before, and not change the database of
  // the next test.
  const { proxy, revoke } = Proxy.revocable(pooled.client, {
    get(target, key) {
      const value: unknown = Reflect.get(target, key, target);
      if (typeof value !== "function") return value;
      const bound: unknown = value.bind(target);
      return bound;
    },
  });
  const db = drizzle({ client: proxy, schema });
  let isClosed = false;
  const close = () => {
    if (!isClosed) {
      isClosed = true;
      revoke();
      closedClients.push(pooled);
    }
    return Promise.resolve();
  };
  return Object.assign(db, { close });
}
