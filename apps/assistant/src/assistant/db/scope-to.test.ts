import { randomUUID } from "node:crypto";
import { createServer } from "node:net";
import { PGlite } from "@electric-sql/pglite";
import { servePglite } from "@tuja/dev-tools/serve-pglite";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { pushDevices } from "../push/push-devices.ts";
import { listUserIds } from "./list-user-ids.ts";
import {
  agentActions,
  agentRuns,
  mailAccounts,
  morningReports,
  passkeys,
  pushSubscriptions,
  schema,
  todoChecklistItems,
  todos,
  users,
  userSettings,
} from "./schema.ts";
import { scopeTo, withoutUser, type UserScope } from "./scope-to.ts";
import { createTestDb, type TestDb } from "./testing/create-test-db.ts";
import { loadMigratedDataDir } from "./testing/load-migrated-data-dir.ts";
import type { AssistantDb } from "./types.ts";

let db: TestDb;
let alice: string;
let bob: string;

async function insertUser(owner: AssistantDb) {
  const id = randomUUID();
  await owner.insert(users).values({ id, displayName: "Test" });
  return id;
}

/** A to-do, a mail account and an agent run of `userId`, written by the owner of the tables. */
async function insertRows(owner: AssistantDb, userId: string) {
  const [todo] = await owner
    .insert(todos)
    .values({ userId, title: `${userId} to-do` })
    .returning();
  const [account] = await owner
    .insert(mailAccounts)
    .values({
      userId,
      provider: "icloud",
      address: "me@icloud.com",
      credential: new Uint8Array([1]),
    })
    .returning();
  const [run] = await owner
    .insert(agentRuns)
    .values({ userId, task: "report", modelId: "m", startedAt: new Date() })
    .returning();
  return { todo, account, run };
}

/** Keeps the transaction, a savepoint and a query that was not awaited past the end, then uses each. */
async function expectKeptHandlesRefused(scope: UserScope) {
  const kept: (() => PromiseLike<unknown>)[] = [];
  const seen = await scope.db.transaction(async (tx) => {
    await tx
      .insert(todos)
      .values({ userId: scope.userId, title: "in a transaction" });
    return tx.transaction((savepoint) => {
      const notAwaited = tx.select().from(todos);
      kept.push(
        () => tx.select().from(todos),
        () => savepoint.select().from(todos),
        () => notAwaited,
      );
      return savepoint.select({ title: todos.title }).from(todos);
    });
  });

  expect(seen).toEqual([{ title: "in a transaction" }]);
  expect(kept).toHaveLength(3);
  for (const use of kept) {
    await expect(Promise.resolve().then(use)).rejects.toThrow();
  }
}

/** A query of the scope inside its own transaction, and one of another scope. */
async function expectNestedScopesHandled(
  owner: AssistantDb,
  userId: string,
  otherUserId: string,
) {
  const scope = scopeTo(owner, userId);
  const seen = await scope.db.transaction(async (tx) => {
    await tx.insert(todos).values({ userId, title: "not committed yet" });
    return {
      rows: await scope.db.select({ title: todos.title }).from(todos),
      inSavepoint: await scope.db.transaction((inner) => inner.$count(todos)),
      other: await scopeTo(owner, otherUserId)
        .db.select()
        .from(todos)
        .then(
          () => null,
          (error: unknown) => String(error),
        ),
    };
  });
  expect(seen.rows).toEqual([{ title: "not committed yet" }]);
  expect(seen.inSavepoint).toBe(1);
  expect(seen.other).toMatch(/inside a transaction of another scope/);
}

beforeEach(async () => {
  db = await createTestDb();
  alice = await insertUser(db);
  bob = await insertUser(db);
});

afterEach(async () => {
  await db.close();
});

describe("a user scope", () => {
  it("reads, changes and deletes only its own user's rows", async () => {
    const own = await insertRows(db, alice);
    const other = await insertRows(db, bob);
    const { db: scoped } = scopeTo(db, alice);

    expect(await scoped.select({ id: todos.id }).from(todos)).toEqual([
      { id: own.todo.id },
    ]);
    expect(await scoped.$count(mailAccounts)).toBe(1);
    expect(
      await scoped
        .update(todos)
        .set({ title: "changed" })
        .where(eq(todos.id, other.todo.id))
        .returning(),
    ).toEqual([]);
    expect(
      await scoped
        .delete(mailAccounts)
        .where(eq(mailAccounts.id, other.account.id))
        .returning(),
    ).toEqual([]);
    expect(
      await db
        .select({ title: todos.title })
        .from(todos)
        .where(eq(todos.id, other.todo.id)),
    ).toEqual([{ title: other.todo.title }]);
    expect(await db.$count(mailAccounts)).toBe(2);
  });

  it("cannot write a row for another user, nor take another user's row in an upsert", async () => {
    await db.insert(userSettings).values({ userId: bob, organiseNotes: "B" });
    const { db: scoped } = scopeTo(db, alice);

    await expect(
      scoped.insert(todos).values({ userId: bob, title: "for B" }),
    ).rejects.toThrow();
    await expect(
      scoped
        .insert(userSettings)
        .values({ userId: bob, organiseNotes: "A" })
        .onConflictDoUpdate({
          target: userSettings.userId,
          set: { organiseNotes: "A" },
        }),
    ).rejects.toThrow();
    expect(await db.select().from(userSettings)).toMatchObject([
      { userId: bob, organiseNotes: "B" },
    ]);
  });

  it("cannot point its rows at another user's rows", async () => {
    const own = await insertRows(db, alice);
    const other = await insertRows(db, bob);
    const { db: scoped } = scopeTo(db, alice);

    await expect(
      scoped.insert(todoChecklistItems).values({
        id: randomUUID(),
        userId: alice,
        todoId: other.todo.id,
        text: "x",
      }),
    ).rejects.toThrow();
    await expect(
      scoped.insert(todos).values({
        userId: alice,
        title: "x",
        sourceAccountId: other.account.id,
      }),
    ).rejects.toThrow();
    await expect(
      scoped
        .update(todos)
        .set({ reAddsTodoId: other.todo.id })
        .where(eq(todos.id, own.todo.id)),
    ).rejects.toThrow();
    await expect(
      scoped.insert(agentActions).values({
        userId: alice,
        runId: other.run.id,
        kind: "move",
        reason: "x",
      }),
    ).rejects.toThrow();

    await scoped.insert(todoChecklistItems).values({
      id: randomUUID(),
      userId: alice,
      todoId: own.todo.id,
      text: "step",
    });
    await scoped.insert(agentActions).values({
      userId: alice,
      runId: own.run.id,
      accountId: own.account.id,
      kind: "move",
      reason: "x",
    });
    expect(await db.$count(todoChecklistItems)).toBe(1);
  });

  it("sees its own user row only, and nothing of sign-in", async () => {
    await db.insert(passkeys).values({
      id: "credential",
      userId: alice,
      publicKey: new Uint8Array([1]),
      counter: 0,
      transports: [],
    });
    const { db: scoped } = scopeTo(db, alice);

    expect(await scoped.select({ id: users.id }).from(users)).toEqual([
      { id: alice },
    ]);
    const refusal: unknown = await scoped
      .select()
      .from(passkeys)
      .then(
        () => null,
        (error: unknown) => error,
      );
    expect(String(Reflect.get(Object(refusal), "cause"))).toMatch(
      /permission denied/,
    );
  });

  it("keeps a transaction to one user, and refuses what is kept past its end", async () => {
    await insertRows(db, bob);
    await expectKeptHandlesRefused(scopeTo(db, alice));
  });

  it("runs a query of the same scope inside its transaction, and refuses another scope's", async () => {
    await expectNestedScopesHandled(db, alice, bob);
  });

  it("joins as drizzle does, with null for a missing row", async () => {
    await insertRows(db, alice);
    const rows = await scopeTo(db, alice)
      .db.select()
      .from(todos)
      .leftJoin(morningReports, eq(morningReports.id, todos.createdReportId));
    expect(rows).toHaveLength(1);
    expect(rows[0].morning_reports).toBeNull();
  });

  it("refuses a scope without a user id", () => {
    expect(() => scopeTo(db, "")).toThrow();
  });
});

describe("assistant_app without a user", () => {
  it("reads no rows", async () => {
    await insertRows(db, alice);
    expect(await withoutUser(db).select().from(todos)).toEqual([]);
    expect(await withoutUser(db).select().from(users)).toEqual([]);
  });

  it("lists the users for a cron, which a user's scope cannot", async () => {
    expect((await listUserIds(db)).toSorted()).toEqual([alice, bob].toSorted());
    const asAlice = await scopeTo(db, alice).db.execute(
      sql`select id from assistant_user_ids() as id`,
    );
    expect(asAlice).toMatchObject({ rows: [] });
  });
});

describe("a push device", () => {
  const device = {
    endpoint: "https://web.push.apple.com/device",
    keys: { p256dh: "key", auth: "auth" },
  };

  it("leaves the user who subscribed it before when another user subscribes it", async () => {
    await pushDevices.save(scopeTo(db, alice), device, "browser");
    await pushDevices.save(scopeTo(db, bob), device, "browser");

    expect(await pushDevices.list(scopeTo(db, alice))).toEqual([]);
    expect(await pushDevices.list(scopeTo(db, bob))).toEqual([device]);
  });

  it("is not taken from another user without a user", async () => {
    await pushDevices.save(scopeTo(db, alice), device, "browser");
    await withoutUser(db).execute(
      sql`select assistant_take_push_endpoint(${device.endpoint})`,
    );
    expect(await db.$count(pushSubscriptions)).toBe(1);
  });
});

describe("the database", () => {
  const rowsOf = <T extends z.ZodType>(row: T) =>
    z.object({ rows: z.array(row) });

  it("limits every table that assistant_app can reach", async () => {
    const tables = rowsOf(
      z.object({ name: z.string(), rls: z.boolean(), policies: z.number() }),
    ).parse(
      await db.execute(sql`
        select c.relname as name, c.relrowsecurity as rls,
          (select count(*)::int from pg_policy p where p.polrelid = c.oid
            and 'assistant_app'::regrole = any(p.polroles)) as policies
        from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r'
          and has_table_privilege('assistant_app', c.oid, 'select, insert, update, delete')
        order by 1`),
    ).rows;
    expect(tables.map((table) => table.name)).toEqual([
      "agent_actions",
      "agent_runs",
      "capture_tokens",
      "mail_accounts",
      "morning_report_previews",
      "morning_reports",
      "push_subscriptions",
      "todo_checklist_items",
      "todos",
      "user_settings",
      "users",
    ]);
    for (const table of tables) {
      expect(table).toMatchObject({ rls: true, policies: 1 });
    }
  });

  it("gives every table with a user_id to assistant_app", async () => {
    const missing = rowsOf(z.object({ name: z.string() })).parse(
      await db.execute(sql`
        select c.relname as name
        from pg_attribute a join pg_class c on c.oid = a.attrelid
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r' and a.attname = 'user_id'
          and not has_table_privilege('assistant_app', c.oid, 'select')
        order by 1`),
    ).rows;
    // The sign-in tables are the owner's alone.
    expect(missing.map((table) => table.name)).toEqual([
      "passkeys",
      "recoveries",
      "sessions",
    ]);
  });
});

describe("a user scope over node-postgres", () => {
  async function freePort() {
    const server = createServer();
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    await new Promise((resolve) => server.close(resolve));
    if (address === null || typeof address === "string") throw new Error();
    return address.port;
  }

  async function withPool(
    max: number,
    work: (owner: AssistantDb, pool: Pool) => Promise<void>,
  ) {
    const client = await PGlite.create({
      loadDataDir: await loadMigratedDataDir(),
    });
    const port = await freePort();
    const server = await servePglite(client, { host: "127.0.0.1", port });
    const pool = new Pool({
      connectionString: `postgres://postgres@127.0.0.1:${String(port)}/postgres`,
      max,
      connectionTimeoutMillis: 2000,
    });
    try {
      await work(drizzle({ client: pool, schema }), pool);
    } finally {
      await pool.end();
      await server.close();
      await client.close();
    }
  }

  it("limits each statement and each transaction to the user", async () => {
    await withPool(3, async (owner) => {
      const a = await insertUser(owner);
      const b = await insertUser(owner);
      await insertRows(owner, a);
      await insertRows(owner, b);
      const { db: scoped } = scopeTo(owner, a);

      const [seen, count, inTransaction] = await Promise.all([
        scoped.select({ userId: todos.userId }).from(todos),
        scoped.$count(mailAccounts),
        scoped.transaction((tx) =>
          tx.select({ userId: agentRuns.userId }).from(agentRuns),
        ),
      ]);
      expect(seen).toEqual([{ userId: a }]);
      expect(count).toBe(1);
      expect(inTransaction).toEqual([{ userId: a }]);
      // The pooled connections keep neither the role nor the user.
      expect(await owner.$count(todos)).toBe(2);
    });
  });

  it("refuses a transaction, savepoint or query kept past the end", async () => {
    await withPool(1, async (owner) => {
      const a = await insertUser(owner);
      await insertRows(owner, await insertUser(owner));
      await expectKeptHandlesRefused(scopeTo(owner, a));
      expect(await owner.$count(todos)).toBe(2);
    });
  });

  it("runs a query of the same scope inside its transaction on the same connection", async () => {
    await withPool(1, async (owner) => {
      await expectNestedScopesHandled(
        owner,
        await insertUser(owner),
        await insertUser(owner),
      );
    });
  });

  // A regression test: drizzle gave no client back when BEGIN failed.
  it("closes the connection of a transaction that failed to begin, and keeps one that rolled back", async () => {
    await withPool(2, async (owner, pool) => {
      const a = await insertUser(owner);
      await insertRows(owner, a);
      const connect = pool.connect.bind(pool);
      let broken = 2;
      Reflect.set(pool, "connect", async () => {
        const client = await connect();
        if (broken > 0) {
          broken -= 1;
          const query: unknown = Reflect.get(client, "query");
          Reflect.set(client, "query", () => {
            Reflect.set(client, "query", query);
            return Promise.reject(new Error("Connection terminated"));
          });
        }
        return client;
      });
      const { db: scoped } = scopeTo(owner, a);

      await expect(scoped.select().from(todos)).rejects.toThrow();
      await expect(scoped.select().from(todos)).rejects.toThrow();
      expect(pool.totalCount).toBe(0);
      Reflect.deleteProperty(pool, "connect");
      expect(await scoped.$count(todos)).toBe(1);

      await expect(scoped.execute(sql`select 1/0`)).rejects.toThrow();
      expect(pool.totalCount).toBe(1);
      expect(await owner.$count(todos)).toBe(1);
    });
  });
});
