import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { categories, members } from "../db/schema.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import {
  seedTestHousehold,
  type SeededHousehold,
} from "../db/testing/seed-test-household.ts";
import { applyMutations } from "./apply-mutations.ts";
import { MutationError } from "./mutation-error.ts";
import type { MutationInput, MutationName } from "./mutation-schema.ts";
import { pullChanges } from "./pull-changes.ts";
import type { PushRequest } from "./push-request-schema.ts";
import { toRejection } from "./to-rejection.ts";

const NOW = new Date("2026-10-10T12:00:00Z");
const CLIENT = "00000000-0000-4000-8000-00000000c002";
const DB_HOOK_TIMEOUT = 60_000;

let db: TestDb;
let home: SeededHousehold;

beforeEach(async () => {
  db = await createTestDb();
  home = await seedTestHousehold(db);
}, DB_HOOK_TIMEOUT);

afterEach(async () => {
  await db.close();
});

function mutation<Name extends MutationName>(
  name: Name,
  args: Extract<MutationInput, { name: Name }>["args"],
) {
  return { id: randomUUID(), name, args };
}

function push(
  mutations: PushRequest["mutations"],
  householdId = home.householdId,
) {
  return applyMutations(db, householdId, { clientId: CLIENT, mutations }, NOW);
}

function groceriesExpense(id = randomUUID()) {
  return mutation("createTransaction", {
    id,
    kind: "expense",
    date: "2026-10-09",
    amountMinor: -1250,
    categoryId: home.groceriesId,
    payeeId: home.grocerId,
    memberId: home.memberId,
    entries: [
      { id: randomUUID(), accountId: home.currentId, amountMinor: -1250 },
    ],
  });
}

describe("toRejection", () => {
  it("rejects data errors and keeps server errors for a retry", () => {
    const wrapped = new Error("Failed query", {
      cause: Object.assign(new Error("numeric field overflow"), {
        code: "22003",
      }),
    });

    expect(toRejection("a", wrapped)).toMatchObject({
      id: "a",
      reason: "invalid",
    });
    expect(toRejection("b", { code: "23505" })).toMatchObject({
      reason: "invalid",
    });
    expect(toRejection("c", { code: "40001" })).toBeUndefined();
    expect(toRejection("d", { code: "57014" })).toBeUndefined();
    expect(toRejection("e", { code: "08006" })).toBeUndefined();
    expect(toRejection("f", new Error("no code"))).toBeUndefined();
    expect(toRejection("g", new MutationError("deleted"))).toMatchObject({
      reason: "deleted",
    });
  });
});

describe("pushes the database cannot store", () => {
  it("rejects them instead of failing the batch", async () => {
    const huge = mutation("setFxRate", {
      base: "USD",
      quote: "GBP",
      on: "2026-10-01",
      rate: 1e300,
    });
    const farPosition = mutation("upsertTag", {
      id: randomUUID(),
      name: "Far",
      position: 2 ** 40,
    });
    const nul = mutation("upsertTag", { id: randomUUID(), name: "a\0b" });
    const entryRate = groceriesExpense();
    entryRate.args.entries[0].fxRate = 12_345_678_901;
    const fine = groceriesExpense();

    const result = await push([huge, farPosition, nul, entryRate, fine]);

    expect(result.applied).toEqual([fine.id]);
    expect(result.rejected.map((rejection) => rejection.reason)).toEqual([
      "invalid",
      "invalid",
      "invalid",
      "invalid",
    ]);
  });
});

describe("upsertMember", () => {
  it("adds a Member without a user", async () => {
    const id = randomUUID();

    const result = await push([
      mutation("upsertMember", { id, name: "Robin" }),
    ]);

    expect(result.rejected).toEqual([]);
    const pulled = await pullChanges(db, home.householdId, 0);
    expect(pulled.tables.members).toContainEqual(
      expect.objectContaining({
        id,
        name: "Robin",
        role: "member",
        userId: null,
      }),
    );
  });

  it("forbids an id of another Household's Member", async () => {
    const other = await seedTestHousehold(db, "other");

    const result = await push([
      mutation("upsertMember", { id: other.memberId, name: "Taken" }),
    ]);

    expect(result.rejected).toEqual([
      expect.objectContaining({ reason: "forbidden" }),
    ]);
    const [stored] = await db
      .select()
      .from(members)
      .where(eq(members.id, other.memberId));
    expect(stored.name).not.toBe("Taken");
  });
});

describe("deleting rows that are in use", () => {
  it("refuses a Category with live Transactions and allows it once they are gone", async () => {
    const expense = groceriesExpense();
    await push([expense]);

    const refused = await push([
      mutation("upsertCategory", { id: home.groceriesId, deleted: true }),
    ]);
    await push([mutation("deleteTransaction", { id: expense.args.id })]);
    const allowed = await push([
      mutation("upsertCategory", { id: home.groceriesId, deleted: true }),
    ]);

    expect(refused.rejected).toEqual([
      expect.objectContaining({ reason: "invalid" }),
    ]);
    expect(allowed.rejected).toEqual([]);
  });

  it("refuses a system Category", async () => {
    const systemId = randomUUID();
    await db.insert(categories).values({
      id: systemId,
      householdId: home.householdId,
      kind: "expense",
      name: "Uncategorised",
      isSystem: true,
      version: 0,
    });

    const result = await push([
      mutation("upsertCategory", { id: systemId, deleted: true }),
    ]);

    expect(result.rejected).toEqual([
      expect.objectContaining({ reason: "invalid" }),
    ]);
  });

  it("refuses an account with Entries", async () => {
    await push([groceriesExpense()]);

    const result = await push([
      mutation("upsertAccount", { id: home.currentId, deleted: true }),
    ]);

    expect(result.rejected).toEqual([
      expect.objectContaining({ reason: "invalid" }),
    ]);
  });

  it("still lets a Transaction whose Category was deleted earlier be edited", async () => {
    const expense = groceriesExpense();
    await push([expense]);
    await db
      .update(categories)
      .set({ deletedAt: NOW })
      .where(eq(categories.id, home.groceriesId));

    const noteOnly = await push([
      mutation("updateTransaction", {
        id: expense.args.id,
        patch: { note: "Weekly shop" },
      }),
    ]);
    const sameCategory = await push([
      mutation("updateTransaction", {
        id: expense.args.id,
        patch: { kind: "expense", categoryId: home.groceriesId },
      }),
    ]);

    expect(noteOnly.rejected).toEqual([]);
    expect(sameCategory.rejected).toEqual([]);
  });
});
