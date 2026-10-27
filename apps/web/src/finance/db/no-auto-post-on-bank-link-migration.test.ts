import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { sql, type SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { FINANCE_MIGRATIONS_FOLDER } from "./finance-migrations-folder.ts";
import { schema } from "./schema.ts";
import { migrationsFolderBefore } from "./testing/migrations-folder-before.ts";
import type { FinanceDb } from "./types.ts";
import { withHousehold } from "./with-household.ts";

const MIGRATION = "0018_no_auto_post_on_bank_link";

const homeId = randomUUID();
const quietHomeId = randomUUID();
const accountIds = {
  linked: randomUUID(),
  unlinked: randomUUID(),
  linkRemoved: randomUUID(),
};

/** Each Rule as a deployment from before the migration writes it, and its state after. */
const seeds = [
  {
    householdId: homeId,
    accounts: [accountIds.linked],
    autoPost: true,
    after: { autoPost: false, version: 6 },
  },
  {
    householdId: homeId,
    accounts: [accountIds.unlinked, accountIds.linked],
    autoPost: true,
    after: { autoPost: false, version: 6 },
  },
  {
    householdId: homeId,
    accounts: [accountIds.unlinked],
    autoPost: true,
    after: { autoPost: true, version: 1 },
  },
  {
    householdId: homeId,
    accounts: [accountIds.linkRemoved],
    autoPost: true,
    after: { autoPost: true, version: 1 },
  },
  {
    householdId: homeId,
    accounts: [accountIds.linked],
    autoPost: false,
    after: { autoPost: false, version: 1 },
  },
  {
    householdId: quietHomeId,
    accounts: [accountIds.linked],
    autoPost: true,
    after: { autoPost: true, version: 1 },
  },
].map((seed) => ({ ...seed, id: randomUUID() }));

let client: PGlite;
let db: FinanceDb;
let before: ReturnType<typeof migrationsFolderBefore>;

async function seedHouseholds() {
  for (const id of [homeId, quietHomeId]) {
    await withHousehold(db, id, (scope) =>
      scope.db.execute(
        sql`insert into households (id, name, clock) values (${id}, 'Home', 5)`,
      ),
    );
  }
  await withHousehold(db, homeId, async (scope) => {
    const groupId = randomUUID();
    const connectionId = randomUUID();
    await scope.db.execute(
      sql`insert into account_groups (id, household_id, name, side, version) values (${groupId}, ${homeId}, 'Cash', 'asset', 1)`,
    );
    await scope.db.execute(
      sql`insert into connections (id, household_id, label, version) values (${connectionId}, ${homeId}, 'Lunch Flow', 1)`,
    );
    for (const [key, id] of Object.entries(accountIds)) {
      await scope.db.execute(
        sql`insert into accounts (id, household_id, group_id, name, kind, currency, version) values (${id}, ${homeId}, ${groupId}, ${key}, 'cash', 'GBP', 1)`,
      );
    }
    await scope.db.execute(
      sql`insert into bank_links (id, household_id, connection_id, account_id, provider_account_id, currency, status, version) values (${randomUUID()}, ${homeId}, ${connectionId}, ${accountIds.linked}, 'linked', 'GBP', 'error', 1)`,
    );
    await scope.db.execute(
      sql`insert into bank_links (id, household_id, connection_id, account_id, provider_account_id, currency, status, version, deleted_at) values (${randomUUID()}, ${homeId}, ${connectionId}, ${accountIds.linkRemoved}, 'removed', 'GBP', 'removed', 1, now())`,
    );
  });
  for (const seed of seeds) {
    const template = JSON.stringify({
      kind: seed.accounts.length > 1 ? "transfer" : "expense",
      entries: seed.accounts.map((accountId, index) => ({
        accountId,
        amountMinor: index === 0 ? -500 : 500,
      })),
    });
    await withHousehold(db, seed.householdId, (scope) =>
      scope.db.execute(
        sql`insert into rules (id, household_id, name, unit, starts_on, next_on, auto_post, template, version) values (${seed.id}, ${seed.householdId}, 'Rent', 'month', '2026-10-01', '2026-11-01', ${seed.autoPost}, ${template}::jsonb, 1)`,
      ),
    );
  }
}

async function select<Row extends z.ZodType>(
  householdId: string,
  row: Row,
  query: SQL,
) {
  const result = await withHousehold(db, householdId, (scope) =>
    scope.db.execute(query),
  );
  return z.object({ rows: z.array(row) }).parse(result).rows;
}

/**
 * Migrates as `owner_like`, a role like Neon's database owner: it is no
 * superuser, so row level security applies to it.
 */
beforeAll(async () => {
  before = migrationsFolderBefore(MIGRATION);
  client = new PGlite();
  await client.exec(`
    create role owner_like login createrole createdb;
    grant create on database postgres to owner_like;
    alter schema public owner to owner_like;
    set role owner_like;
  `);
  const migrated = drizzle({ client, schema });
  db = migrated;
  await migrate(migrated, { migrationsFolder: before.folder });
  await seedHouseholds();
  await migrate(migrated, { migrationsFolder: FINANCE_MIGRATIONS_FOLDER });
});

afterAll(async () => {
  await client.close();
  before.remove();
});

describe(`migration ${MIGRATION}`, () => {
  it("stops each Rule on an account with a live Bank link from posting automatically, at the next version of its Household", async () => {
    for (const householdId of [homeId, quietHomeId]) {
      const rules = await select(
        householdId,
        z.object({
          id: z.string(),
          autoPost: z.boolean(),
          version: z.coerce.number(),
        }),
        sql`select id, auto_post as "autoPost", version from rules`,
      );
      expect(new Map(rules.map(({ id, ...state }) => [id, state]))).toEqual(
        new Map(
          seeds
            .filter((seed) => seed.householdId === householdId)
            .map((seed) => [seed.id, seed.after]),
        ),
      );
    }
    const clock = (householdId: string) =>
      select(
        householdId,
        z.object({ clock: z.coerce.number() }),
        sql`select clock from households`,
      );
    expect(await clock(homeId)).toEqual([{ clock: 6 }]);
    expect(await clock(quietHomeId)).toEqual([{ clock: 5 }]);
  });

  it("leaves row level security forced on the tables", async () => {
    const { rows } = z
      .object({ rows: z.array(z.object({ forced: z.boolean() })) })
      .parse(
        await db.execute(sql`
          select relforcerowsecurity as forced from pg_class
          where oid in ('households'::regclass, 'rules'::regclass, 'bank_links'::regclass)
        `),
      );
    expect(rows).toEqual([
      { forced: true },
      { forced: true },
      { forced: true },
    ]);
  });
});
