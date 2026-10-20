import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accountGroups, households, passkeys, users } from "../schema.ts";
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
