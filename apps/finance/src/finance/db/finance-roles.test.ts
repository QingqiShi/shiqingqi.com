import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { FINANCE_MIGRATIONS_FOLDER } from "./finance-migrations-folder.ts";
import { listHouseholdIds } from "./list-household-ids.ts";
import { households, schema } from "./schema.ts";
import { failureOf } from "./testing/failure-of.ts";
import type { FinanceDb } from "./types.ts";
import { asFinanceApp, withHousehold } from "./with-household.ts";

const householdId = randomUUID();

let client: PGlite;
let db: FinanceDb;

async function hasRole(role: string, member: string, privilege: string) {
  const [row] = await db
    .select({
      has: sql<boolean>`pg_has_role(${member}, ${role}, ${privilege})`,
    })
    .from(sql`(select 1) as one`);
  return row.has;
}

/**
 * Migrates as `owner_like`: a role like Neon's database owner, which can
 * create roles and owns the schema but is no superuser. PGlite cannot log in
 * as it, so the session user stays the superuser and `set role` is never
 * refused; the test checks the memberships that `set role` needs instead.
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
  await migrate(migrated, { migrationsFolder: FINANCE_MIGRATIONS_FOLDER });
  db = migrated;
});

afterAll(async () => {
  await client.close();
});

describe("after the migration as the database owner", () => {
  it("lets the owner set role to finance_app, but not read as finance_auth", async () => {
    expect(await hasRole("finance_app", "owner_like", "SET")).toBe(true);
    expect(await hasRole("finance_auth", "owner_like", "USAGE")).toBe(false);
  });

  it("hands the lookup functions to finance_auth", async () => {
    const owners = await db
      .select({
        name: sql<string>`proname`,
        owner: sql<string>`proowner::regrole`,
      })
      .from(sql`pg_proc`)
      .where(sql`pronamespace = 'finance_auth'::regnamespace`);
    expect(owners.length).toBeGreaterThan(0);
    expect(owners.map((row) => row.owner)).toEqual(
      owners.map(() => "finance_auth"),
    );
  });

  it("hides a Household from the owner until the owner sets a scope", async () => {
    await withHousehold(db, householdId, (scope) =>
      scope.db.insert(households).values({ id: householdId, name: "Home" }),
    );
    expect(await db.$count(households)).toBe(0);
    expect(
      await withHousehold(db, householdId, (scope) =>
        scope.db.$count(households),
      ),
    ).toBe(1);
    expect(await listHouseholdIds(db)).toEqual([householdId]);
  });
});

describe("a login role that is only a member of finance_app", () => {
  beforeAll(async () => {
    await client.exec(`
      reset role;
      create role finance_web login noinherit;
      grant finance_app to finance_web;
      set role finance_web;
    `);
  });

  afterAll(async () => {
    await client.exec("reset role");
  });

  it("can do nothing outside a scope", async () => {
    expect(await failureOf(db.$count(households))).toMatch(
      /permission denied for table households/,
    );
    expect(
      await failureOf(
        db
          .select({ id: sql`id` })
          .from(sql`finance_auth.household_ids() as ids(id)`),
      ),
    ).toMatch(/permission denied for schema finance_auth/);
  });

  it("reaches its Household inside a scope, and the lookups as finance_app", async () => {
    expect(
      await withHousehold(db, householdId, (scope) =>
        scope.db.$count(households),
      ),
    ).toBe(1);
    expect(await asFinanceApp(db, (tx) => tx.$count(households))).toBe(0);
    expect(await listHouseholdIds(db)).toEqual([householdId]);
  });
});
