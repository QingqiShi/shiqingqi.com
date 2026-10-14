import { readFileSync } from "node:fs";
import path from "node:path";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { FINANCE_MIGRATIONS_FOLDER } from "./finance-migrations-folder.ts";
import { accounts, institutionIcons } from "./schema.ts";
import { createTestDb, type TestDb } from "./testing/create-test-db.ts";
import { seedTestHousehold } from "./testing/seed-test-household.ts";

const DB_HOOK_TIMEOUT = 60_000;

let db: TestDb;

beforeAll(async () => {
  db = await createTestDb();
}, DB_HOOK_TIMEOUT);

afterAll(async () => {
  await db.close();
});

describe("migration 0012 institution_icon_version", () => {
  it("gives each account the version of the cached icon of the domain it shows", async () => {
    const home = await seedTestHousehold(db);
    await db.insert(institutionIcons).values([
      {
        domain: "guessed.example",
        image: new Uint8Array([1]),
        version: "v-guessed",
      },
      {
        domain: "chosen.example",
        image: new Uint8Array([2]),
        version: "v-chosen",
      },
      { domain: "failed.example", image: null, version: null },
    ]);
    await db
      .update(accounts)
      .set({
        institutionDomain: "chosen.example",
        guessedInstitutionDomain: "guessed.example",
      })
      .where(eq(accounts.id, home.currentId));
    await db
      .update(accounts)
      .set({ guessedInstitutionDomain: "guessed.example" })
      .where(eq(accounts.id, home.savingsId));
    await db
      .update(accounts)
      .set({ guessedInstitutionDomain: "failed.example" })
      .where(eq(accounts.id, home.cardId));

    await db.execute(
      sql`alter table "accounts" drop column "institution_icon_version"`,
    );
    const migration = readFileSync(
      path.join(FINANCE_MIGRATIONS_FOLDER, "0012_institution_icon_version.sql"),
      "utf8",
    );
    for (const statement of migration.split("--> statement-breakpoint")) {
      await db.execute(sql.raw(statement));
    }

    const rows = await db
      .select({
        id: accounts.id,
        version: accounts.institutionIconVersion,
      })
      .from(accounts);
    const versionOf = (id: string) =>
      rows.find((row) => row.id === id)?.version;
    expect(versionOf(home.currentId)).toBe("v-chosen");
    expect(versionOf(home.savingsId)).toBe("v-guessed");
    expect(versionOf(home.cardId)).toBeNull();
  });
});
