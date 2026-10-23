import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { asc, sql } from "drizzle-orm";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { FINANCE_MIGRATIONS_FOLDER } from "./finance-migrations-folder.ts";
import { exchangeRates, schema } from "./schema.ts";
import { migrationsFolderBefore } from "./testing/migrations-folder-before.ts";
import type { FinanceDb } from "./types.ts";
import { withHousehold } from "./with-household.ts";

const MIGRATION = "0014_exchange_rates";

const homeId = randomUUID();
const otherId = randomUUID();

let client: PGlite;
let migrated: PgliteDatabase<typeof schema>;
let db: FinanceDb;
let before: ReturnType<typeof migrationsFolderBefore>;
let ownerSawBefore: number;

async function seedHousehold(
  householdId: string,
  rates: {
    base: string;
    quote: string;
    on: string;
    rate: number;
    source?: string;
  }[],
) {
  await withHousehold(db, householdId, async (scope) => {
    await scope.db.execute(
      sql`insert into households (id, name) values (${householdId}, 'Home')`,
    );
    for (const rate of rates) {
      await scope.db.execute(
        sql`insert into fx_rates (household_id, base, quote, "on", rate, source, version) values (${householdId}, ${rate.base}, ${rate.quote}, ${rate.on}, ${rate.rate}, ${rate.source ?? "import"}, 1)`,
      );
    }
  });
}

async function countFxRates(from: Pick<FinanceDb, "execute"> = db) {
  const [{ count }] = z
    .object({ rows: z.array(z.object({ count: z.number() })) })
    .parse(
      await from.execute(sql`select count(*)::int as count from fx_rates`),
    ).rows;
  return count;
}

/**
 * Migrates as `owner_like`, a role like Neon's database owner: it is no
 * superuser, so row level security on `fx_rates` applies to it.
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
  migrated = drizzle({ client, schema });
  db = migrated;
  await migrate(migrated, { migrationsFolder: before.folder });
  await seedHousehold(homeId, [
    { base: "CNY", quote: "GBP", on: "2024-01-02", rate: 0.1075 },
    { base: "USD", quote: "GBP", on: "2024-01-02", rate: 1 },
    { base: "GBP", quote: "GBP", on: "2024-01-03", rate: 2 },
    { base: "GBP", quote: "EUR", on: "2024-01-04", rate: 1.16 },
  ]);
  await seedHousehold(otherId, [
    { base: "CNY", quote: "GBP", on: "2024-01-02", rate: 0.2 },
    {
      base: "CNY",
      quote: "GBP",
      on: "2024-01-05",
      rate: 0.108,
      source: "manual",
    },
  ]);
  ownerSawBefore = await countFxRates();
  await migrate(migrated, { migrationsFolder: FINANCE_MIGRATIONS_FOLDER });
});

afterAll(async () => {
  await client.close();
  before.remove();
});

describe(`migration ${MIGRATION}`, () => {
  it("copies every Household's rates but one to one, and keeps fx_rates and entries.fx_rate for older deployments", async () => {
    const rows = await db
      .select({
        base: exchangeRates.base,
        quote: exchangeRates.quote,
        on: exchangeRates.on,
        rate: exchangeRates.rate,
        source: exchangeRates.source,
      })
      .from(exchangeRates)
      .orderBy(asc(exchangeRates.base), asc(exchangeRates.on));
    const kept = [homeId, otherId].sort()[0] === homeId ? 0.1075 : 0.2;
    expect(rows).toEqual([
      {
        base: "CNY",
        quote: "GBP",
        on: "2024-01-02",
        rate: kept,
        source: "household",
      },
      {
        base: "CNY",
        quote: "GBP",
        on: "2024-01-05",
        rate: 0.108,
        source: "household",
      },
      {
        base: "GBP",
        quote: "EUR",
        on: "2024-01-04",
        rate: 1.16,
        source: "household",
      },
    ]);

    const retired = z
      .object({ rows: z.array(z.object({ name: z.string() })) })
      .parse(
        await db.execute(sql`
          select table_name as name from information_schema.tables where table_name = 'fx_rates'
          union all
          select column_name from information_schema.columns where table_name = 'entries' and column_name = 'fx_rate'
        `),
      ).rows;
    expect(retired).toEqual([{ name: "fx_rates" }, { name: "fx_rate" }]);
  });

  it("leaves row level security on fx_rates as it was", async () => {
    const [security] = z
      .object({
        rows: z.array(
          z.object({
            enabled: z.boolean(),
            forced: z.boolean(),
            policies: z.array(z.string()),
          }),
        ),
      })
      .parse(
        await db.execute(sql`
          select relrowsecurity as enabled, relforcerowsecurity as forced,
            array(select polname::text from pg_policy where polrelid = 'fx_rates'::regclass) as policies
          from pg_class where oid = 'fx_rates'::regclass
        `),
      ).rows;
    expect(ownerSawBefore).toBe(0);
    expect(security).toEqual({
      enabled: true,
      forced: true,
      policies: ["household_isolation"],
    });

    expect(await countFxRates()).toBe(0);
    expect(
      await withHousehold(db, otherId, (scope) => countFxRates(scope.db)),
    ).toBe(2);
  });
});
