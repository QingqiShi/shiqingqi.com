import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  accountGroups,
  accounts,
  entries,
  households,
  passkeys,
  transactions,
  users,
} from "../schema.ts";
import { createTestDb, type TestDb } from "./create-test-db.ts";

const householdId = "00000000-0000-4000-8000-000000000001";
const groupId = "00000000-0000-4000-8000-000000000002";
const accountId = "00000000-0000-4000-8000-000000000003";
const transactionId = "00000000-0000-4000-8000-000000000004";

let db: TestDb;

beforeAll(async () => {
  db = await createTestDb();
});

afterAll(async () => {
  await db.close();
});

describe("createTestDb", () => {
  it("applies every migration", async () => {
    const tableCount = await db.$count(
      sql`information_schema.tables`,
      sql`table_schema = 'public'`,
    );
    expect(tableCount).toBe(26);
  });

  it("round-trips a household, an account and a transaction", async () => {
    await db.insert(households).values({ id: householdId, name: "Home" });
    await db.insert(accountGroups).values({
      id: groupId,
      householdId,
      name: "流动资产",
      side: "asset",
      version: 1,
    });
    await db.insert(accounts).values({
      id: accountId,
      householdId,
      groupId,
      name: "Current",
      kind: "cash",
      currency: "GBP",
      version: 1,
    });
    await db.insert(transactions).values({
      id: transactionId,
      householdId,
      kind: "expense",
      date: "2026-10-09",
      amountMinor: -1250,
      version: 1,
    });
    await db.insert(entries).values({
      id: "00000000-0000-4000-8000-000000000005",
      householdId,
      transactionId,
      accountId,
      date: "2026-10-09",
      amountMinor: -1250,
      fxRate: 1.23456789,
      version: 1,
    });

    const [household] = await db
      .select()
      .from(households)
      .where(eq(households.id, householdId));
    expect(household).toMatchObject({
      baseCurrency: "GBP",
      timezone: "Europe/London",
      clock: 0,
    });

    const rows = await db
      .select({
        date: transactions.date,
        amountMinor: transactions.amountMinor,
        status: transactions.status,
        entryAmountMinor: entries.amountMinor,
        fxRate: entries.fxRate,
      })
      .from(transactions)
      .innerJoin(entries, eq(entries.transactionId, transactions.id))
      .where(eq(transactions.householdId, householdId));
    expect(rows).toEqual([
      {
        date: "2026-10-09",
        amountMinor: -1250,
        status: "posted",
        entryAmountMinor: -1250,
        fxRate: 1.23456789,
      },
    ]);
  });

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
    await expect(
      db.insert(accountGroups).values({
        id: "00000000-0000-4000-8000-000000000007",
        householdId,
        name: "流动资产",
        side: "asset",
        version: 2,
      }),
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
