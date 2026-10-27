import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { FINANCE_MIGRATIONS_FOLDER } from "./finance-migrations-folder.ts";
import { schema } from "./schema.ts";
import { migrationsFolderBefore } from "./testing/migrations-folder-before.ts";
import type { FinanceDb } from "./types.ts";
import { withHousehold } from "./with-household.ts";

const MIGRATION = "0017_bank_rows_waiting";

const homeId = randomUUID();
const accountIds = { waiting: randomUUID(), quiet: randomUUID() };
const linkIds = { waiting: randomUUID(), quiet: randomUUID() };

let client: PGlite;
let db: FinanceDb;
let before: ReturnType<typeof migrationsFolderBefore>;

/** Writes a Household with two Bank links, as a deployment from before the migration does. */
async function seedHousehold() {
  await withHousehold(db, homeId, async (scope) => {
    const groupId = randomUUID();
    const connectionId = randomUUID();
    await scope.db.execute(
      sql`insert into households (id, name) values (${homeId}, 'Home')`,
    );
    await scope.db.execute(
      sql`insert into account_groups (id, household_id, name, side, version) values (${groupId}, ${homeId}, 'Cash', 'asset', 1)`,
    );
    await scope.db.execute(
      sql`insert into connections (id, household_id, label, version) values (${connectionId}, ${homeId}, 'Lunch Flow', 1)`,
    );
    for (const key of ["waiting", "quiet"] as const) {
      await scope.db.execute(
        sql`insert into accounts (id, household_id, group_id, name, kind, currency, version) values (${accountIds[key]}, ${homeId}, ${groupId}, ${key}, 'cash', 'GBP', 1)`,
      );
      await scope.db.execute(
        sql`insert into bank_links (id, household_id, connection_id, account_id, provider_account_id, currency, balance_difference_minor, version) values (${linkIds[key]}, ${homeId}, ${connectionId}, ${accountIds[key]}, ${key}, 'GBP', 100, 1)`,
      );
    }
    const rows = [
      { linkId: linkIds.waiting, amountMinor: -500, state: "new" },
      { linkId: linkIds.quiet, amountMinor: 0, state: "new" },
      { linkId: linkIds.quiet, amountMinor: -500, state: "ignored" },
    ];
    for (const row of rows) {
      await scope.db.execute(
        sql`insert into bank_transactions (id, household_id, link_id, provider_tx_id, date, amount_minor, currency, raw, state, version) values (${randomUUID()}, ${homeId}, ${row.linkId}, ${randomUUID()}, '2026-10-08', ${row.amountMinor}, 'GBP', '{}', ${row.state}, 1)`,
      );
    }
  });
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
  await seedHousehold();
  await migrate(migrated, { migrationsFolder: FINANCE_MIGRATIONS_FOLDER });
});

afterAll(async () => {
  await client.close();
  before.remove();
});

describe(`migration ${MIGRATION}`, () => {
  it("marks each Bank link whose usable new rows wait for the AI step", async () => {
    const { rows } = z
      .object({
        rows: z.array(z.object({ id: z.string(), waiting: z.boolean() })),
      })
      .parse(
        await withHousehold(db, homeId, (scope) =>
          scope.db.execute(
            sql`select id, bank_rows_waiting as waiting from bank_links`,
          ),
        ),
      );
    expect(new Map(rows.map((row) => [row.id, row.waiting]))).toEqual(
      new Map([
        [linkIds.waiting, true],
        [linkIds.quiet, false],
      ]),
    );
  });

  it("leaves row level security forced on the Bank tables", async () => {
    const { rows } = z
      .object({ rows: z.array(z.object({ forced: z.boolean() })) })
      .parse(
        await db.execute(sql`
          select relforcerowsecurity as forced from pg_class
          where oid in ('bank_links'::regclass, 'bank_transactions'::regclass)
        `),
      );
    expect(rows).toEqual([{ forced: true }, { forced: true }]);
  });

  it("queues the account days a write changes in balance_drift_days", async () => {
    const { rows } = z
      .object({ rows: z.array(z.object({ day: z.string() })) })
      .parse(
        await withHousehold(db, homeId, async (scope) => {
          await scope.db.execute(
            sql`insert into valuations (id, household_id, account_id, "on", amount_minor, version) values (${randomUUID()}, ${homeId}, ${accountIds.quiet}, '2026-10-09', 100, 2)`,
          );
          return scope.db.execute(
            sql`select day::text as day from balance_drift_days`,
          );
        }),
      );
    expect(rows).toEqual([{ day: "2026-10-09" }]);
  });
});
