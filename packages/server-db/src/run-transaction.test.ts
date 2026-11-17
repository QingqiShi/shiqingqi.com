import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { integer, pgTable } from "drizzle-orm/pg-core";
import { drizzle as drizzleOnPglite } from "drizzle-orm/pglite";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { runTransaction } from "./run-transaction.ts";
import { poolOn, watchPool } from "./testing/watch-pool.ts";

const counts = pgTable("counts", { value: integer("value").notNull() });

let pglite: PGlite;
let served: Awaited<ReturnType<typeof poolOn>>;
let watched: ReturnType<typeof watchPool>;
let db: ReturnType<typeof drizzle<{ counts: typeof counts }>>;

beforeAll(async () => {
  pglite = await PGlite.create();
  await pglite.exec("create table counts (value integer not null)");
  served = await poolOn(pglite);
  watched = watchPool(served.pool);
  db = drizzle({ client: served.pool, schema: { counts } });
});

afterAll(async () => {
  await served.close();
  await pglite.close();
});

beforeEach(async () => {
  watched.releases.length = 0;
  await pglite.exec("delete from counts");
});

async function values() {
  return (await db.select().from(counts)).map(({ value }) => value);
}

it("commits the work and gives the client back", async () => {
  expect(
    await runTransaction(db, async (tx) => {
      await tx.insert(counts).values({ value: 1 });
      return tx.query.counts.findMany();
    }),
  ).toEqual([{ value: 1 }]);
  expect(watched.releases).toEqual([false]);
  expect(await values()).toEqual([1]);
});

it("rolls back the work that fails, gives the client back, and throws the work's error", async () => {
  const failure = new Error("The work failed.");
  await expect(
    runTransaction(db, async (tx) => {
      await tx.insert(counts).values({ value: 1 });
      throw failure;
    }),
  ).rejects.toBe(failure);
  expect(watched.releases).toEqual([false]);
  expect(await values()).toEqual([]);
});

it("rolls back a savepoint in the transaction", async () => {
  await runTransaction(db, async (tx) => {
    await tx.insert(counts).values({ value: 1 });
    await tx
      .transaction(async (inner) => {
        await inner.insert(counts).values({ value: 2 });
        throw new Error("The savepoint failed.");
      })
      .catch(() => undefined);
  });
  expect(await values()).toEqual([1]);
});

it("throws when the database rolls back at COMMIT, after the work caught a failed statement", async () => {
  await expect(
    runTransaction(db, async (tx) => {
      await tx.insert(counts).values({ value: 1 });
      await tx.execute(sql`select 1 / 0`).catch(() => undefined);
    }),
  ).rejects.toThrow(/rolled the transaction back/);
  expect(watched.releases).toEqual([false]);
  expect(await values()).toEqual([]);
});

it("begins the transaction with its config", async () => {
  await expect(
    runTransaction(db, (tx) => tx.insert(counts).values({ value: 1 }), {
      accessMode: "read only",
    }),
  ).rejects.toThrow();
  expect(watched.releases).toEqual([false]);
  expect(await values()).toEqual([]);
});

// A regression test: drizzle's transaction kept the client after a failed
// BEGIN, and gave back a client whose COMMIT or ROLLBACK failed.
it.each([
  { name: "BEGIN", fail: ["begin"] },
  { name: "COMMIT", fail: ["commit"] },
  { name: "a statement, then ROLLBACK", fail: ["select", "rollback"] },
])(
  "closes the client once when $name fails, and the next transaction works",
  async ({ fail }) => {
    watched.failNext(fail);
    await expect(
      runTransaction(db, async (tx) => {
        await tx.execute(sql`select set_config('role', 'postgres', true)`);
        await tx.insert(counts).values({ value: 1 });
      }),
    ).rejects.toThrow();
    expect(watched.releases).toEqual([true]);
    expect(served.pool.totalCount).toBe(0);

    await runTransaction(db, (tx) => tx.insert(counts).values({ value: 2 }));
    expect(watched.releases).toEqual([true, false]);
    expect(await values()).toContain(2);
  },
);

it("runs as drizzle's transaction on a driver with no pool", async () => {
  const local = drizzleOnPglite({ client: pglite });
  await runTransaction(local, (tx) => tx.insert(counts).values({ value: 3 }));
  expect(await local.select().from(counts)).toEqual([{ value: 3 }]);
});
