import { PGlite } from "@electric-sql/pglite";
import { poolOn, watchPool } from "@tuja/server-db/testing/watch-pool";
import { drizzle } from "drizzle-orm/node-postgres";
import { drizzle as drizzleOnPglite } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, expect, it } from "vitest";
import { resolveSession } from "../auth/resolve-session.ts";
import { asArchive } from "./as-archive.ts";
import { asViewer } from "./as-viewer.ts";
import { BUDDY_MIGRATIONS_FOLDER } from "./buddy-migrations-folder.ts";
import { accounts } from "./schema.ts";
import type { BuddyDb } from "./types.ts";

let pglite: PGlite;
let served: Awaited<ReturnType<typeof poolOn>>;
let watched: ReturnType<typeof watchPool>;
let db: BuddyDb;

beforeAll(async () => {
  pglite = await PGlite.create();
  await migrate(drizzleOnPglite({ client: pglite }), {
    migrationsFolder: BUDDY_MIGRATIONS_FOLDER,
  });
  served = await poolOn(pglite);
  watched = watchPool(served.pool);
  db = drizzle({ client: served.pool });
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
      asViewer(db, null, (tx) =>
        tx.select({ name: accounts.name }).from(accounts),
      ),
    expected: [],
  },
  {
    name: "asArchive",
    read: () =>
      asArchive(db, (tx) => tx.select({ id: accounts.id }).from(accounts)),
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
