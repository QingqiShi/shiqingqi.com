import { PGlite } from "@electric-sql/pglite";
import { poolOn, watchPool } from "@tuja/server-db/testing/watch-pool";
import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, beforeAll, expect, it } from "vitest";
import { schema, users } from "#src/assistant/db/schema.ts";
import { loadMigratedDataDir } from "#src/assistant/db/testing/load-migrated-data-dir.ts";
import type { AssistantDb } from "#src/assistant/db/types.ts";
import { assistantAuthConfig } from "./make-assistant-auth.ts";
import { resolveSession } from "./resolve-session.ts";

let pglite: PGlite;
let served: Awaited<ReturnType<typeof poolOn>>;
let watched: ReturnType<typeof watchPool>;
let db: AssistantDb;

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
    name: "the sign-in transaction",
    read: () =>
      assistantAuthConfig.transaction(db, (tx) =>
        tx.select({ id: users.id }).from(users).limit(0),
      ),
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
