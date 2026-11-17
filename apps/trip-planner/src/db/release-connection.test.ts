import { PGlite } from "@electric-sql/pglite";
import { poolOn, watchPool } from "@tuja/server-db/testing/watch-pool";
import { drizzle } from "drizzle-orm/node-postgres";
import { drizzle as drizzleOnPglite } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, expect, it } from "vitest";
import { resolveSession } from "#src/auth/resolve-session.ts";
import { asViewer } from "#src/trips/as-viewer.ts";
import { schema, trips } from "./schema.ts";
import { TRIPS_MIGRATIONS_FOLDER } from "./trips-migrations-folder.ts";
import type { TripsDb } from "./types.ts";

let pglite: PGlite;
let served: Awaited<ReturnType<typeof poolOn>>;
let watched: ReturnType<typeof watchPool>;
let db: TripsDb;

beforeAll(async () => {
  pglite = await PGlite.create();
  await migrate(drizzleOnPglite({ client: pglite }), {
    migrationsFolder: TRIPS_MIGRATIONS_FOLDER,
  });
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
    name: "asViewer",
    read: () =>
      asViewer(db, null, (tx) => tx.select({ id: trips.id }).from(trips)),
    expected: [],
  },
  {
    name: "resolveSession",
    read: () =>
      resolveSession(db, "no-such-token", {
        now: new Date(),
        allowRefresh: false,
      }),
    expected: null,
  },
])(
  "$name gives the connection back when BEGIN fails",
  async ({ read, expected }) => {
    watched.failNext(["begin"]);
    await expect(read()).rejects.toThrow();
    expect(served.pool.totalCount).toBe(0);
    expect(await read()).toEqual(expected);
  },
);
