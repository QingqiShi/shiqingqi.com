import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import {
  accountGroups,
  exchangeRates,
  households,
  passkeys,
  users,
} from "../schema.ts";
import { createTestDb, type TestDb } from "./create-test-db.ts";

const householdId = "00000000-0000-4000-8000-000000000001";
const groupId = "00000000-0000-4000-8000-000000000002";
const otherGroupId = "00000000-0000-4000-8000-000000000003";

let db: TestDb;

beforeAll(async () => {
  db = await createTestDb();
});

afterAll(async () => {
  await db.close();
});

describe("createTestDb", () => {
  it("round-trips a bigint beyond 32 bits and bytes", async () => {
    const userId = "00000000-0000-4000-8000-000000000006";
    await db.insert(users).values({ id: userId, displayName: "Qingqi" });
    await db.insert(passkeys).values({
      id: "credential",
      userId,
      publicKey: new Uint8Array([1, 2, 255]),
      counter: 2 ** 40,
      transports: ["internal", "hybrid"],
    });

    const [passkey] = await db
      .select()
      .from(passkeys)
      .where(eq(passkeys.userId, userId));
    expect(passkey.counter).toBe(2 ** 40);
    expect(Array.from(passkey.publicKey)).toEqual([1, 2, 255]);
    expect(passkey.transports).toEqual(["internal", "hybrid"]);
  });

  it("rejects a second live group with the same name", async () => {
    await db.insert(households).values({ id: householdId, name: "Home" });
    const group = {
      householdId,
      name: "流动资产",
      side: "asset",
      version: 1,
    } as const;
    await db.insert(accountGroups).values({ ...group, id: groupId });
    await expect(
      db.insert(accountGroups).values({ ...group, id: otherGroupId }),
    ).rejects.toThrow();
  });
});

describe("createTestDb copies", () => {
  it("are empty and isolated from each other", async () => {
    const first = await createTestDb();
    const second = await createTestDb();
    await first.insert(households).values({ id: householdId, name: "One" });

    expect(await first.select().from(households)).toHaveLength(1);
    expect(await second.select().from(households)).toHaveLength(0);

    await first.close();
    await second.close();
  });
});

const countSchema = z.object({
  rows: z.array(z.object({ count: z.number() })),
});

async function count(runner: TestDb, query: string) {
  return countSchema.parse(await runner.execute(sql.raw(query))).rows[0]?.count;
}

describe("createTestDb after close", () => {
  async function insertRate(runner: TestDb) {
    const [row] = await runner
      .insert(exchangeRates)
      .values({
        base: "EUR",
        quote: "GBP",
        on: "2026-10-01",
        rate: 0.85,
        source: "ecb",
      })
      .returning({ seq: exchangeRates.seq });
    return row.seq;
  }

  it("gives the next database the migrated rows, sequences and settings", async () => {
    const migrations =
      "select count(*)::int as count from drizzle.__drizzle_migrations";
    const first = await createTestDb();
    const migrationCount = await count(first, migrations);
    await first.insert(households).values({ id: householdId, name: "One" });
    expect(await insertRate(first)).toBe(1);
    await first.execute(
      sql`select set_config('statement_timeout', '5s', false)`,
    );
    await first.close();

    const second = await createTestDb();
    expect(await second.select().from(households)).toHaveLength(0);
    expect(await insertRate(second)).toBe(1);
    expect(await count(second, migrations)).toBe(migrationCount);
    const timeout = z
      .object({ rows: z.array(z.object({ statement_timeout: z.string() })) })
      .parse(await second.execute(sql`show statement_timeout`));
    expect(timeout.rows[0]?.statement_timeout).toBe("0");
    await second.close();
  });

  it("puts the first row of the next database where a new database puts it", async () => {
    const first = await createTestDb();
    await first.insert(households).values({ id: householdId, name: "One" });
    await first.close();

    const second = await createTestDb();
    const inserted = z
      .object({ rows: z.array(z.object({ ctid: z.string() })) })
      .parse(
        await second.execute(
          sql`insert into households (id, name) values (${householdId}, 'Two') returning ctid::text`,
        ),
      );
    expect(inserted.rows[0]?.ctid).toBe("(0,1)");
    await second.close();
  });

  it("gives the next database the migrated schema", async () => {
    const first = await createTestDb();
    await first.execute(
      sql`alter table "households" add column "extra" integer`,
    );
    await first.close();

    const second = await createTestDb();
    expect(
      await count(
        second,
        "select count(*)::int as count from information_schema.columns where table_name = 'households' and column_name = 'extra'",
      ),
    ).toBe(0);
    await second.close();
  });

  it("rejects a query after close", async () => {
    const closed = await createTestDb();
    await closed.close();
    await expect(closed.select().from(households)).rejects.toThrow();
  });

  it("gives a database to one next caller when it is closed twice", async () => {
    const closedTwice = await createTestDb();
    await closedTwice.close();
    await closedTwice.close();

    const first = await createTestDb();
    const second = await createTestDb();
    await first.insert(households).values({ id: householdId, name: "One" });
    expect(await second.select().from(households)).toHaveLength(0);
    await first.close();
    await second.close();
  });
});
