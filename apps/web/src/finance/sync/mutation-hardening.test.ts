import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { members } from "../db/schema.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import { mutation } from "../db/testing/mutation.ts";
import {
  seedTestHousehold,
  type SeededHousehold,
} from "../db/testing/seed-test-household.ts";
import { applyMutations } from "./apply-mutations.ts";
import { MutationError } from "./mutation-error.ts";
import type { PushRequest } from "./push-request-schema.ts";
import { toRejection } from "./to-rejection.ts";

const NOW = new Date("2026-10-10T12:00:00Z");
const CLIENT = "00000000-0000-4000-8000-00000000c002";

let db: TestDb;
let home: SeededHousehold;

beforeEach(async () => {
  db = await createTestDb();
  home = await seedTestHousehold(db);
});

afterEach(async () => {
  await db.close();
});

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
    categoryId: home.groceriesId,
    payeeId: home.grocerId,
    memberId: home.memberId,
    entries: [
      { id: randomUUID(), accountId: home.currentId, amountMinor: -1250 },
    ],
  });
}

describe("toRejection", () => {
  it("rejects data errors and keeps server and schema errors for a retry", () => {
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
    expect(toRejection("h", { code: "42703" })).toBeUndefined();
    expect(toRejection("i", { code: "42P01" })).toBeUndefined();
    expect(toRejection("j", { code: "55P03" })).toBeUndefined();
    expect(toRejection("k", { code: "42501" })).toMatchObject({
      reason: "invalid",
    });
    expect(toRejection("l", { code: "42804" })).toMatchObject({
      reason: "invalid",
    });
    expect(toRejection("f", new Error("no code"))).toBeUndefined();
    expect(toRejection("g", new MutationError("deleted"))).toMatchObject({
      reason: "deleted",
    });
  });
});

describe("pushes the database cannot store", () => {
  it("rejects them instead of failing the batch", async () => {
    const farPosition = mutation("upsertTag", {
      id: randomUUID(),
      name: "Far",
      position: 2 ** 40,
    });
    const nul = mutation("upsertTag", { id: randomUUID(), name: "a\0b" });
    const fine = groceriesExpense();

    const result = await push([farPosition, nul, fine]);

    expect(result.applied).toEqual([fine.id]);
    expect(result.rejected.map((rejection) => rejection.reason)).toEqual([
      "invalid",
      "invalid",
    ]);
  });
});

describe("upsertMember", () => {
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
