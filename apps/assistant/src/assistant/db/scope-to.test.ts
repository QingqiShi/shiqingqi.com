import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import type { Pool, PoolClient } from "pg";
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
import { scopeTo, withoutUser } from "./scope-to.ts";
import { createTestDb, type TestDb } from "./testing/create-test-db.ts";
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

const titlesOf = async (owner: AssistantDb) =>
  (await owner.select({ title: todos.title }).from(todos))
    .map((row) => row.title)
    .toSorted();

const textOf = (args: unknown[]) => {
  const [query] = args;
  return typeof query === "string"
    ? query
    : String(Reflect.get(Object(query), "text"));
};

/** Wraps `query` of each client that the pool gives out. */
function onEachQuery(
  pool: Pool,
  wrap: (send: () => Promise<unknown>, text: string) => Promise<unknown>,
) {
  const wrapped = new WeakSet<PoolClient>();
  pool.on("acquire", (client: PoolClient) => {
    const query: unknown = Reflect.get(client, "query");
    if (wrapped.has(client) || typeof query !== "function") return;
    wrapped.add(client);
    Reflect.set(client, "query", (...args: unknown[]) =>
      wrap(
        () => Promise.resolve(Reflect.apply(query, client, args)),
        textOf(args).trim().toLowerCase(),
      ),
    );
  });
}

async function withOneConnection(work: (owner: TestDb) => Promise<void>) {
  const owner = await createTestDb({ maxConnections: 1 });
  try {
    await work(owner);
  } finally {
    await owner.close();
  }
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

  it("limits statements and transactions at once to the user, and leaves the connections clean", async () => {
    await insertRows(db, alice);
    await insertRows(db, bob);
    const { db: scoped } = scopeTo(db, alice);

    const [seen, count, inTransaction] = await Promise.all([
      scoped.select({ userId: todos.userId }).from(todos),
      scoped.$count(mailAccounts),
      scoped.transaction((tx) =>
        tx.select({ userId: agentRuns.userId }).from(agentRuns),
      ),
    ]);
    expect(seen).toEqual([{ userId: alice }]);
    expect(count).toBe(1);
    expect(inTransaction).toEqual([{ userId: alice }]);
    expect(await db.$count(todos)).toBe(2);
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

  it("refuses an owner that is not on a pg Pool", async () => {
    const client = await PGlite.create();
    try {
      await expect(
        scopeTo(drizzle({ client, schema }), alice).db.select().from(todos),
      ).rejects.toThrow(/pg Pool/);
    } finally {
      await client.close();
    }
  });
});

describe("a transaction of a user scope", () => {
  it("refuses the transaction, a savepoint and a query kept past its end", async () => {
    await insertRows(db, bob);
    const scope = scopeTo(db, alice);
    const kept: (() => PromiseLike<unknown>)[] = [];
    const seen = await scope.db.transaction(async (tx) => {
      await tx.insert(todos).values({ userId: alice, title: "mine" });
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

    expect(seen).toEqual([{ title: "mine" }]);
    for (const use of kept) {
      await expect(Promise.resolve().then(use)).rejects.toThrow();
    }
  });

  // A regression test: a query that the work did not await ran as the owner
  // while the COMMIT or the ROLLBACK ran.
  it("refuses a query from the end of the work, also while COMMIT or ROLLBACK runs", async () => {
    await insertRows(db, bob);
    let hold = Promise.withResolvers<null>();
    let held = Promise.withResolvers<null>();
    onEachQuery(db.pool, async (send, text) => {
      if (text === "commit" || text === "rollback") {
        held.resolve(null);
        await hold.promise;
      }
      return send();
    });

    for (const fails of [false, true]) {
      hold = Promise.withResolvers();
      held = Promise.withResolvers();
      const kept: AssistantDb[] = [];
      const done = scopeTo(db, alice)
        .db.transaction(async (tx) => {
          kept.push(tx);
          await tx.select().from(todos);
          if (fails) throw new Error("The work failed.");
        })
        .catch(() => undefined);
      await held.promise;
      const late = expect(
        kept[0]
          .select({ userId: todos.userId })
          .from(todos)
          .then((rows) => rows),
      ).rejects.toThrow();
      hold.resolve(null);
      await done;
      await late;
    }
  });

  it("runs a query and a transaction of the same scope in it, on its connection, and refuses another scope's", async () => {
    await withOneConnection(async (owner) => {
      const userId = await insertUser(owner);
      const otherUserId = await insertUser(owner);
      const scope = scopeTo(owner, userId);
      const seen = await scope.db.transaction(async (tx) => {
        await tx.insert(todos).values({ userId, title: "not committed yet" });
        return {
          rows: await scope.db.select({ title: todos.title }).from(todos),
          inSavepoint: await scope.db.transaction((inner) =>
            inner.$count(todos),
          ),
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
    });
  });

  it("sends one query at a time on its connection", async () => {
    let running = 0;
    let most = 0;
    onEachQuery(db.pool, async (send) => {
      running += 1;
      most = Math.max(most, running);
      try {
        return await send();
      } finally {
        running -= 1;
      }
    });
    const scope = scopeTo(db, alice);

    const counts = await scope.db.transaction(async (tx) => {
      await tx.insert(todos).values({ userId: alice, title: "mine" });
      return Promise.all(
        Array.from({ length: 10 }, (_, index) =>
          index % 2 ? scope.db.$count(todos) : tx.$count(todos),
        ),
      );
    });
    expect(counts).toEqual(Array.from({ length: 10 }, () => 1));
    expect(most).toBe(1);
  });

  // A regression test: each savepoint of the scope had the name sp1, so a
  // rollback went to the wrong one.
  it("rolls back each nested savepoint to its own start", async () => {
    const scope = scopeTo(db, alice);
    const add = (title: string) =>
      scope.db.insert(todos).values({ userId: alice, title });

    await scope.db.transaction(async () => {
      await add("before");
      await scope.db
        .transaction(async (outer) => {
          await add("outer");
          await scope.db
            .transaction(async () => {
              await add("inner");
              throw new Error("The inner savepoint failed.");
            })
            .catch(() => undefined);
          await outer.transaction(async () => {
            await add("inner, kept");
          });
          throw new Error("The outer savepoint failed.");
        })
        .catch(() => undefined);
      await add("after");
    });

    expect(await titlesOf(db)).toEqual(["after", "before"]);
  });

  it("refuses a second savepoint while one is open", async () => {
    const scope = scopeTo(db, alice);

    const outcomes = await scope.db.transaction(async () => {
      const results = await Promise.allSettled([
        scope.db.transaction(async (savepoint) => {
          await savepoint
            .insert(todos)
            .values({ userId: alice, title: "first" });
        }),
        scope.db.transaction(async (savepoint) => {
          await savepoint
            .insert(todos)
            .values({ userId: alice, title: "second" });
        }),
      ]);
      return results.map((result) =>
        result.status === "rejected" ? String(result.reason) : "done",
      );
    });

    expect(outcomes[0]).toBe("done");
    expect(outcomes[1]).toMatch(/innermost open transaction or savepoint/);
    expect(await titlesOf(db)).toEqual(["first"]);
  });

  it("fails loudly when a caught error of a statement made COMMIT roll back", async () => {
    const scope = scopeTo(db, alice);

    await expect(
      scope.db.transaction(async (tx) => {
        await tx.insert(todos).values({ userId: alice, title: "lost" });
        await scope.db.execute(sql`select 1/0`).catch(() => undefined);
      }),
    ).rejects.toThrow(/rolled the transaction back at its COMMIT/);
    expect(await db.$count(todos)).toBe(0);
  });

  // A regression test: drizzle gave no client back when BEGIN failed.
  it("closes the connection of a transaction that failed to begin, and keeps one that rolled back", async () => {
    await withOneConnection(async (owner) => {
      const userId = await insertUser(owner);
      await insertRows(owner, userId);
      const { pool } = owner;
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
      const { db: scoped } = scopeTo(owner, userId);

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
