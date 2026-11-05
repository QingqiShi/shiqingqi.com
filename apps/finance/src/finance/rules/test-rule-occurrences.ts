import { randomUUID } from "node:crypto";
import { and, asc, eq, isNull } from "drizzle-orm";
import { afterEach, beforeEach, expect } from "vitest";
import { accountBalanceDays, entries, transactions } from "../db/schema.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import {
  seedTestHousehold,
  type SeededHousehold,
} from "../db/testing/seed-test-household.ts";
import { applyMutations } from "../sync/apply-mutations.ts";

export let db: TestDb;
export let home: SeededHousehold;

export function setUpRuleTestHousehold() {
  beforeEach(async () => {
    db = await createTestDb();
    home = await seedTestHousehold(db);
  });

  afterEach(async () => {
    await db.close();
  });
}

export async function createRule(
  fields: Record<string, unknown>,
  now = new Date("2026-01-25T12:00:00Z"),
) {
  const id = randomUUID();
  await push(
    "upsertRule",
    {
      id,
      name: "Rent",
      unit: "month",
      startsOn: "2026-01-31",
      template: {
        kind: "expense",
        categoryId: home.groceriesId,
        payeeId: home.grocerId,
        entries: [{ accountId: home.currentId, amountMinor: -120_000 }],
      },
      ...fields,
    },
    now,
  );
  return id;
}

export async function push(
  name: string,
  args: Record<string, unknown>,
  now: Date,
) {
  const result = await applyMutations(
    db,
    home.householdId,
    { clientId: randomUUID(), mutations: [{ id: randomUUID(), name, args }] },
    now,
  );
  expect(result.rejected).toEqual([]);
}

export function balanceDays() {
  return db
    .select({
      day: accountBalanceDays.day,
      balanceMinor: accountBalanceDays.balanceMinor,
    })
    .from(accountBalanceDays);
}

/** An Expected Transaction of the Rule whose id is not the one Materialise gives. */
export async function insertImported(
  ruleId: string,
  date: string,
  fields: { id?: string; deletedAt?: Date } = {},
) {
  const id = fields.id ?? randomUUID();
  await db.insert(transactions).values({
    id,
    householdId: home.householdId,
    kind: "expense",
    status: "expected",
    date,
    categoryId: home.groceriesId,
    payeeId: home.grocerId,
    ruleId,
    source: "import",
    version: 1,
    deletedAt: fields.deletedAt ?? null,
  });
  await db.insert(entries).values({
    id: randomUUID(),
    householdId: home.householdId,
    transactionId: id,
    accountId: home.currentId,
    date,
    amountMinor: -120_000,
    version: 1,
    deletedAt: fields.deletedAt ?? null,
  });
  return id;
}

export async function ruleDays(ruleId: string) {
  return (await ruleTransactions(ruleId)).map((row) => row.date);
}

export function ruleTransactions(ruleId: string) {
  return db
    .select({
      id: transactions.id,
      date: transactions.date,
      status: transactions.status,
    })
    .from(transactions)
    .where(and(eq(transactions.ruleId, ruleId), isNull(transactions.deletedAt)))
    .orderBy(asc(transactions.date));
}
