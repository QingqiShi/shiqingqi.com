import { randomUUID } from "node:crypto";
import { and, asc, eq, isNull } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  accountBalanceDays,
  households,
  members,
  rules,
  transactions,
} from "../db/schema.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import {
  seedTestHousehold,
  type SeededHousehold,
} from "../db/testing/seed-test-household.ts";
import { applyMutations } from "../sync/apply-mutations.ts";
import { materialiseRules, occurrenceId } from "./materialise-rules.ts";

/** The first test database of a file runs the migrations, which is slow on a busy machine. */
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

async function createRule(
  fields: Record<string, unknown>,
  now = new Date("2026-01-25T12:00:00Z"),
) {
  const id = randomUUID();
  const result = await applyMutations(
    db,
    home.householdId,
    {
      clientId: randomUUID(),
      mutations: [
        {
          id: randomUUID(),
          name: "upsertRule",
          args: {
            id,
            name: "Rent",
            unit: "month",
            startsOn: "2026-01-31",
            template: {
              kind: "expense",
              amountMinor: -120_000,
              categoryId: home.groceriesId,
              payeeId: home.grocerId,
              entries: [{ accountId: home.currentId, amountMinor: -120_000 }],
            },
            ...fields,
          },
        },
      ],
    },
    now,
  );
  expect(result.rejected).toEqual([]);
  return id;
}

function ruleTransactions(ruleId: string) {
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

describe("materialiseRules", () => {
  it("creates Expected transactions a week ahead, clamped to the month's end, once", async () => {
    const ruleId = await createRule({});
    expect(await ruleTransactions(ruleId)).toEqual([
      {
        id: occurrenceId(ruleId, "2026-01-31"),
        date: "2026-01-31",
        status: "expected",
      },
    ]);

    const scope = { db, householdId: home.householdId };
    const late = new Date("2026-02-22T12:00:00Z");
    const first = await materialiseRules(scope, late);
    const second = await materialiseRules(scope, late);

    expect(first.written).toBeGreaterThan(0);
    expect(second).toEqual({ written: 0, clock: first.clock });
    expect(await ruleTransactions(ruleId)).toEqual([
      {
        id: occurrenceId(ruleId, "2026-01-31"),
        date: "2026-01-31",
        status: "expected",
      },
      {
        id: occurrenceId(ruleId, "2026-02-28"),
        date: "2026-02-28",
        status: "expected",
      },
    ]);
    const [rule] = await db.select().from(rules).where(eq(rules.id, ruleId));
    expect(rule.nextOn).toBe("2026-03-31");
    const [household] = await db.select().from(households);
    expect(household.clock).toBe(first.clock);
  });

  it("makes new occurrences Shared once the rule's Member is removed", async () => {
    const ruleId = await createRule({
      template: {
        kind: "expense",
        amountMinor: -120_000,
        categoryId: home.groceriesId,
        payeeId: home.grocerId,
        memberId: home.partnerId,
        entries: [{ accountId: home.currentId, amountMinor: -120_000 }],
      },
    });
    await db
      .update(members)
      .set({ deletedAt: new Date("2026-02-01T12:00:00Z") })
      .where(eq(members.id, home.partnerId));

    await materialiseRules(
      { db, householdId: home.householdId },
      new Date("2026-02-22T12:00:00Z"),
    );

    const rows = await db
      .select({ date: transactions.date, memberId: transactions.memberId })
      .from(transactions)
      .where(eq(transactions.ruleId, ruleId))
      .orderBy(asc(transactions.date));
    expect(rows).toEqual([
      { date: "2026-01-31", memberId: home.partnerId },
      { date: "2026-02-28", memberId: null },
    ]);
  });

  it("does not bring back a skipped occurrence", async () => {
    const ruleId = await createRule({});
    const skippedId = occurrenceId(ruleId, "2026-01-31");
    await applyMutations(
      db,
      home.householdId,
      {
        clientId: randomUUID(),
        mutations: [
          { id: randomUUID(), name: "skipExpected", args: { id: skippedId } },
        ],
      },
      new Date("2026-01-26T12:00:00Z"),
    );
    await db.update(rules).set({ nextOn: "2026-01-31" });

    await materialiseRules(
      { db, householdId: home.householdId },
      new Date("2026-01-25T12:00:00Z"),
    );

    expect(await ruleTransactions(ruleId)).toEqual([]);
  });

  it("posts auto_post occurrences on their day and moves the balance", async () => {
    const ruleId = await createRule(
      { autoPost: true, startsOn: "2026-02-01", dayOfMonth: 1 },
      new Date("2026-01-28T12:00:00Z"),
    );
    expect(await ruleTransactions(ruleId)).toEqual([
      expect.objectContaining({ date: "2026-02-01", status: "expected" }),
    ]);

    await materialiseRules(
      { db, householdId: home.householdId },
      new Date("2026-02-01T08:00:00Z"),
    );

    expect(await ruleTransactions(ruleId)).toEqual([
      expect.objectContaining({ date: "2026-02-01", status: "posted" }),
    ]);
    expect(
      await db
        .select({
          day: accountBalanceDays.day,
          balanceMinor: accountBalanceDays.balanceMinor,
        })
        .from(accountBalanceDays),
    ).toEqual([{ day: "2026-02-01", balanceMinor: -120_000 }]);
  });

  it("creates nothing for a paused rule", async () => {
    const ruleId = await createRule({ paused: true });
    expect(await ruleTransactions(ruleId)).toEqual([]);
  });
});
