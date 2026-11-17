import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { poolOn, watchPool } from "@tuja/server-db/testing/watch-pool";
import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, beforeAll, expect, it } from "vitest";
import { accounts, schema, users } from "./schema.ts";
import { loadMigratedDataDir } from "./testing/load-migrated-data-dir.ts";
import type { FinanceDb } from "./types.ts";
import { asFinanceApp, withHousehold } from "./with-household.ts";

let pglite: PGlite;
let served: Awaited<ReturnType<typeof poolOn>>;
let watched: ReturnType<typeof watchPool>;
let db: FinanceDb;

beforeAll(async () => {
  pglite = await PGlite.create({ loadDataDir: await loadMigratedDataDir() });
  served = await poolOn(pglite);
  watched = watchPool(served.pool);
  db = drizzle({ client: served.pool, schema });
});

afterAll(async () => {
  await served.close();
  await pglite.close();
});

// A regression test: drizzle's transaction kept the connection when BEGIN
// failed, and a few such failures left no connection for any request.
it.each([
  {
    name: "asFinanceApp",
    read: () =>
      asFinanceApp(db, (tx) =>
        tx.select({ id: users.id }).from(users).limit(0),
      ),
  },
  {
    name: "withHousehold",
    read: () =>
      withHousehold(
        db,
        randomUUID(),
        ({ db: tx }) => tx.select({ id: accounts.id }).from(accounts),
        { isolationLevel: "repeatable read", accessMode: "read only" },
      ),
  },
])("$name gives the connection back when BEGIN fails", async ({ read }) => {
  watched.failNext(["begin"]);
  await expect(read()).rejects.toThrow();
  expect(served.pool.totalCount).toBe(0);
  expect(await read()).toEqual([]);
});
