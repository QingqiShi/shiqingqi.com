import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import {
  eq,
  getTableColumns,
  getTableName,
  is,
  sql,
  type SQL,
} from "drizzle-orm";
import { PgTable, type PgColumn } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { ASSISTANT_MIGRATIONS_FOLDER } from "./assistant-migrations-folder.ts";
import { listUserIds } from "./list-user-ids.ts";
import {
  invites,
  mailAccounts,
  mailCategories,
  mailFolders,
  mailMessages,
  passkeys,
  schema,
  sessions,
  users,
  userSettings,
} from "./schema.ts";
import { createTestDb, type TestDb } from "./testing/create-test-db.ts";
import { failureOf } from "./testing/failure-of.ts";
import type { AssistantDb } from "./types.ts";
import { asAssistantApp, withUser, type AssistantAppDb } from "./with-user.ts";

const tables: PgTable[] = Object.values(schema).flatMap((value) =>
  is(value, PgTable) ? [value] : [],
);
const globalTables = new Set<PgTable>([users, passkeys, sessions, invites]);

/** Every table whose rows belong to one user, with the column that names the user. */
const userTables = tables
  .filter((table) => !globalTables.has(table))
  .map((table) => {
    const columns: Record<string, PgColumn> = getTableColumns(table);
    if (!("userId" in columns)) {
      throw new Error(`${getTableName(table)} has no user_id`);
    }
    return { name: getTableName(table), table, key: columns.userId };
  });

/**
 * One row of `userId` in every user table. A new user table needs a row
 * here, or the first test fails.
 */
async function seedEveryUserTable(db: AssistantDb, userId: string) {
  await db.insert(users).values({ id: userId, displayName: userId });
  await db.insert(userSettings).values({ userId });
  const [account] = await db
    .insert(mailAccounts)
    .values({
      userId,
      provider: "icloud",
      address: `${userId}@icloud.com`,
      credential: new Uint8Array([1]),
    })
    .returning();
  const [category] = await db
    .insert(mailCategories)
    .values({ userId, name: "Bills" })
    .returning();
  const [folder] = await db
    .insert(mailFolders)
    .values({
      userId,
      accountId: account.id,
      path: "Bills",
      name: "Bills",
      categoryId: category.id,
    })
    .returning();
  await db.insert(mailMessages).values({
    userId,
    accountId: account.id,
    folderId: folder.id,
    uidValidity: 1,
    uid: 1,
    messageId: `<${userId}@example.com>`,
    receivedAt: new Date(),
  });
}

const countSchema = z.object({
  rows: z.array(z.object({ count: z.number() })),
});

/** How many rows `statement`, a data-modifying statement with `returning`, changed. */
async function countChanged(db: AssistantAppDb, statement: SQL) {
  const result: unknown = await db.execute(
    sql`with changed as (${statement}) select count(*)::int as count from changed`,
  );
  return countSchema.parse(result).rows[0]?.count ?? 0;
}

let db: TestDb;
const a = randomUUID();
const b = randomUUID();

function countRows(table: PgTable, key: PgColumn, userId: string) {
  return db.$count(table, eq(key, userId));
}

beforeAll(async () => {
  db = await createTestDb();
  await seedEveryUserTable(db, a);
  await seedEveryUserTable(db, b);
});

afterAll(async () => {
  await db.close();
});

describe("the schema", () => {
  it("has a seeded row of both users in every user table", async () => {
    for (const { name, table, key } of userTables) {
      expect(await countRows(table, key, a), name).toBeGreaterThan(0);
      expect(await countRows(table, key, b), name).toBeGreaterThan(0);
    }
  });

  it("forces row level security with the user_isolation policy on every user table, and on no global table", async () => {
    const rows = await db
      .select({
        name: sql<string>`c.relname`,
        forced: sql<boolean>`c.relrowsecurity and c.relforcerowsecurity`,
        policies: sql<
          string[]
        >`coalesce(array_agg(p.policyname order by p.policyname) filter (where p.policyname is not null), '{}')`,
      })
      .from(sql`pg_class c`)
      .leftJoin(
        sql`pg_policies p`,
        sql`p.tablename = c.relname and p.schemaname = 'public'`,
      )
      .where(sql`c.relnamespace = 'public'::regnamespace and c.relkind = 'r'`)
      .groupBy(sql`c.relname, c.relrowsecurity, c.relforcerowsecurity`);
    const byName = new Map(rows.map((row) => [row.name, row]));

    for (const { name } of userTables) {
      expect(byName.get(name)?.forced, name).toBe(true);
      expect(byName.get(name)?.policies, name).toEqual(["user_isolation"]);
    }
    for (const table of globalTables) {
      expect(byName.get(getTableName(table))?.forced).toBe(false);
    }
  });

  it("lets assistant_app use every table without owning any, and without BYPASSRLS", async () => {
    const [role] = await db
      .select({
        superuser: sql<boolean>`rolsuper`,
        bypassesRls: sql<boolean>`rolbypassrls`,
        canLogIn: sql<boolean>`rolcanlogin`,
      })
      .from(sql`pg_roles`)
      .where(sql`rolname = 'assistant_app'`);
    expect(role).toEqual({
      superuser: false,
      bypassesRls: false,
      canLogIn: false,
    });
    expect(
      await db.$count(sql`pg_class`, sql`relowner = 'assistant_app'::regrole`),
    ).toBe(0);
    for (const table of tables) {
      const [privilege] = await db
        .select({
          granted: sql<boolean>`has_table_privilege('assistant_app', ${sql.raw(`'${getTableName(table)}'`)}, 'SELECT, INSERT, UPDATE, DELETE')`,
        })
        .from(sql`(select 1) as one`);
      expect(privilege.granted, getTableName(table)).toBe(true);
    }
  });
});

describe("a user scope", () => {
  it.each(userTables)(
    "reads, updates and deletes only its own rows of $name",
    async ({ table, key }) => {
      const own = await countRows(table, key, a);
      const others = await countRows(table, key, b);
      const keepKey = sql`update ${table} set ${sql.identifier(key.name)} = ${key}`;

      const seen = await withUser(db, a, async (scope) => ({
        read: await scope.db.$count(table),
        updated: await countChanged(scope.db, sql`${keepKey} returning 1`),
        updatedOfOther: await countChanged(
          scope.db,
          sql`${keepKey} where ${key} = ${b} returning 1`,
        ),
        deletedOfOther: await countChanged(
          scope.db,
          sql`delete from ${table} where ${key} = ${b} returning 1`,
        ),
      }));

      expect(seen).toEqual({
        read: own,
        updated: own,
        updatedOfOther: 0,
        deletedOfOther: 0,
      });
      expect(await countRows(table, key, b)).toBe(others);
    },
  );

  it.each(userTables)(
    "cannot insert a row of another user into $name",
    async ({ table, key }) => {
      const [row] = await db.select().from(table).where(eq(key, b));
      const { id, ...rest } = row;
      const copy =
        typeof id === "string" ? { ...rest, id: randomUUID() } : rest;
      expect(
        await failureOf(
          withUser(db, a, (scope) => scope.db.insert(table).values(copy)),
        ),
      ).toMatch(/row-level security/);
    },
  );

  it.each(userTables)(
    "cannot move its own row of $name to another user",
    async ({ table, key }) => {
      expect(
        await failureOf(
          withUser(db, a, (scope) =>
            scope.db.execute(
              sql`update ${table} set ${sql.identifier(key.name)} = ${b}`,
            ),
          ),
        ),
      ).toMatch(/row-level security/);
    },
  );

  it("sees no user rows without a user, and inserts none", async () => {
    const counts = await asAssistantApp(db, async (tx) => {
      const counts: number[] = [];
      for (const { table } of userTables) counts.push(await tx.$count(table));
      return counts;
    });
    expect(counts).toEqual(userTables.map(() => 0));
    expect(
      await failureOf(
        asAssistantApp(db, (tx) =>
          tx.insert(userSettings).values({ userId: a }),
        ),
      ),
    ).toMatch(/row-level security/);
  });

  it("sees nothing of a user that does not exist", async () => {
    const counts = await withUser(db, randomUUID(), async (scope) => {
      const counts: number[] = [];
      for (const { table } of userTables) {
        counts.push(await scope.db.$count(table));
      }
      return counts;
    });
    expect(counts).toEqual(userTables.map(() => 0));
  });
});

describe("after the migration as a database owner that is no superuser", () => {
  let client: PGlite;
  let ownerDb: AssistantDb;
  const userId = randomUUID();

  /**
   * Migrates as `owner_like`: a role like Neon's database owner, which can
   * create roles and owns the schema but is no superuser. Then a login role
   * that is only a member of `assistant_app` stands in for the app.
   */
  beforeAll(async () => {
    client = new PGlite();
    await client.exec(`
      create role owner_like login createrole createdb;
      grant create on database postgres to owner_like;
      alter schema public owner to owner_like;
      set role owner_like;
    `);
    const migrated = drizzle({ client, schema });
    await migrate(migrated, { migrationsFolder: ASSISTANT_MIGRATIONS_FOLDER });
    ownerDb = migrated;
    await client.exec(`
      reset role;
      create role assistant_web login noinherit;
      grant assistant_app to assistant_web;
      set role assistant_web;
    `);
  });

  afterAll(async () => {
    await client.close();
  });

  it("can do nothing outside a scope", async () => {
    expect(await failureOf(ownerDb.$count(users))).toMatch(
      /permission denied for table users/,
    );
  });

  it("reaches the global tables, and only its own user rows inside a scope", async () => {
    await asAssistantApp(ownerDb, (tx) =>
      tx.insert(users).values({ id: userId, displayName: "Owner" }),
    );
    await withUser(ownerDb, userId, (scope) =>
      scope.db.insert(userSettings).values({ userId }),
    );
    expect(await listUserIds(ownerDb)).toEqual([userId]);
    expect(
      await withUser(ownerDb, userId, (scope) => scope.db.$count(userSettings)),
    ).toBe(1);
    expect(
      await withUser(ownerDb, randomUUID(), (scope) =>
        scope.db.$count(userSettings),
      ),
    ).toBe(0);
  });
});
