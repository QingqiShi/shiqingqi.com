import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { eq, sql } from "drizzle-orm";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { FINANCE_MIGRATIONS_FOLDER } from "./finance-migrations-folder.ts";
import { monthTotals, schema, transactions } from "./schema.ts";
import { insertTestExpense } from "./testing/insert-test-expense.ts";
import { migrationsFolderBefore } from "./testing/migrations-folder-before.ts";
import {
  seedTestHousehold,
  type SeededHousehold,
} from "./testing/seed-test-household.ts";

const MIGRATION = "0015_derived_transaction_amounts";

let client: PGlite;
let db: PgliteDatabase<typeof schema>;
let before: ReturnType<typeof migrationsFolderBefore>;
let home: SeededHousehold;

/** Writes a Transaction and a month total as a deployment from before the migration does. */
async function writeAsOlderDeployment(id: string) {
  await db.execute(sql`
    insert into transactions (id, household_id, kind, date, amount_minor, category_id, version)
    values (${id}, ${home.householdId}, 'expense', '2026-01-05', -1250, ${home.groceriesId}, 1)
  `);
  await db.execute(sql`
    insert into month_totals (household_id, month, kind, category_id, amount_minor, count, version)
    values (${home.householdId}, '2026-01-01', 'expense', ${home.groceriesId}, -1250, 1, 1)
    on conflict do nothing
  `);
}

beforeAll(async () => {
  before = migrationsFolderBefore(MIGRATION);
  client = new PGlite();
  db = drizzle({ client, schema });
  await migrate(db, { migrationsFolder: before.folder });
  home = await seedTestHousehold(db);
});

afterAll(async () => {
  await client.close();
  before.remove();
});

describe(`migration ${MIGRATION}`, () => {
  it("lets a Transaction have no stored amount and keeps what older deployments use", async () => {
    const oldId = randomUUID();
    await writeAsOlderDeployment(oldId);

    await migrate(db, { migrationsFolder: FINANCE_MIGRATIONS_FOLDER });

    const newId = await insertTestExpense(
      db,
      home,
      home.cardId,
      "2026-01-06",
      -800,
    );
    const stored = await db
      .select({ id: transactions.id, amountMinor: transactions.amountMinor })
      .from(transactions)
      .where(eq(transactions.householdId, home.householdId));
    expect(new Map(stored.map((row) => [row.id, row.amountMinor]))).toEqual(
      new Map([
        [oldId, -1250],
        [newId, null],
      ]),
    );

    await writeAsOlderDeployment(randomUUID());
    const totals = await db
      .select({ amountMinor: monthTotals.amountMinor })
      .from(monthTotals);
    expect(totals).toEqual([{ amountMinor: -1250 }]);
  });

  it("removes nothing", async () => {
    const migration = readFileSync(
      path.join(FINANCE_MIGRATIONS_FOLDER, `${MIGRATION}.sql`),
      "utf8",
    );
    expect(migration).not.toMatch(/\bdrop\s+(table|column)\b/i);
    const [{ nullable }] = z
      .object({ rows: z.array(z.object({ nullable: z.string() })) })
      .parse(
        await db.execute(sql`
          select is_nullable as nullable from information_schema.columns
          where table_name = 'transactions' and column_name = 'amount_minor'
        `),
      ).rows;
    expect(nullable).toBe("YES");
  });
});
