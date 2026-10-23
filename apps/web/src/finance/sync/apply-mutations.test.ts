import { randomUUID } from "node:crypto";
import { and, asc, eq, isNull } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  accountBalanceDays,
  entries,
  payees,
  rules,
  transactions,
  transactionTags,
  valuations,
} from "../db/schema.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import { mutation } from "../db/testing/mutation.ts";
import {
  seedTestHousehold,
  type SeededHousehold,
} from "../db/testing/seed-test-household.ts";
import { withHousehold } from "../db/with-household.ts";
import {
  balanceSeriesToRows,
  computeBalanceDays,
} from "../domain/balance/compute-balance-days.ts";
import { applyMutations } from "./apply-mutations.ts";
import { DerivedTouches } from "./derived-touches.ts";
import { pullChanges } from "./pull-changes.ts";
import type { PushRequest } from "./push-request-schema.ts";
import { transactionMutations } from "./transaction-mutations.ts";

const NOW = new Date("2026-10-10T12:00:00Z");
/** Matches any Date; typed `unknown` so it is not an `any` in the expectations. */
const A_DATE: unknown = expect.any(Date);
const CLIENT = "00000000-0000-4000-8000-00000000c001";

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
  clientId = CLIENT,
  householdId = home.householdId,
) {
  return applyMutations(db, householdId, { clientId, mutations }, NOW);
}

function expense(
  id: string,
  date: string,
  amountMinor: number,
  household = home,
  accountId = household.currentId,
) {
  return mutation("createTransaction", {
    id,
    kind: "expense",
    date,
    categoryId: household.groceriesId,
    payeeId: household.grocerId,
    memberId: household.memberId,
    entries: [{ id: randomUUID(), accountId, amountMinor }],
  });
}

async function storedBalanceDays(accountId: string) {
  return db
    .select({
      day: accountBalanceDays.day,
      balanceMinor: accountBalanceDays.balanceMinor,
    })
    .from(accountBalanceDays)
    .where(
      and(
        eq(accountBalanceDays.accountId, accountId),
        isNull(accountBalanceDays.deletedAt),
      ),
    )
    .orderBy(asc(accountBalanceDays.day));
}

/** The balance days the domain engine gives from the account's stored rows. */
async function engineBalanceDays(accountId: string) {
  const valuationRows = await db
    .select({ on: valuations.on, amountMinor: valuations.amountMinor })
    .from(valuations)
    .where(
      and(eq(valuations.accountId, accountId), isNull(valuations.deletedAt)),
    );
  const entryRows = await db
    .select({ date: entries.date, amountMinor: entries.amountMinor })
    .from(entries)
    .innerJoin(transactions, eq(transactions.id, entries.transactionId))
    .where(
      and(
        eq(entries.accountId, accountId),
        isNull(entries.deletedAt),
        isNull(transactions.deletedAt),
        eq(transactions.status, "posted"),
      ),
    );
  return balanceSeriesToRows(computeBalanceDays(valuationRows, entryRows));
}

describe("applyMutations", () => {
  it("creates a transfer with two entries and keeps account_balance_days equal to computeBalanceDays", async () => {
    const transferId = randomUUID();
    const result = await push([
      mutation("putValuation", {
        id: randomUUID(),
        accountId: home.currentId,
        on: "2026-09-30",
        amountMinor: 100_000,
      }),
      expense(randomUUID(), "2026-10-02", -2_500),
      mutation("createTransaction", {
        id: transferId,
        kind: "transfer",
        date: "2026-10-03",
        entries: [
          { id: randomUUID(), accountId: home.currentId, amountMinor: -50_000 },
          { id: randomUUID(), accountId: home.savingsId, amountMinor: 50_000 },
        ],
        tagIds: [home.trainTagId],
      }),
    ]);

    expect(result.rejected).toEqual([]);
    expect(result.applied).toHaveLength(3);
    expect(result.clock).toBe(1);
    const transferEntries = await db
      .select()
      .from(entries)
      .where(eq(entries.transactionId, transferId));
    expect(transferEntries).toHaveLength(2);
    expect(transferEntries.every((entry) => entry.version === 1)).toBe(true);

    for (const accountId of [home.currentId, home.savingsId]) {
      expect(await storedBalanceDays(accountId)).toEqual(
        await engineBalanceDays(accountId),
      );
    }
    expect(await storedBalanceDays(home.currentId)).toEqual([
      { day: "2026-09-30", balanceMinor: 100_000 },
      { day: "2026-10-02", balanceMinor: 97_500 },
      { day: "2026-10-03", balanceMinor: 47_500 },
    ]);
  });

  it("keeps balances right when a back-dated entry lands before a valuation", async () => {
    await push([
      expense(randomUUID(), "2026-09-01", -1_000),
      mutation("putValuation", {
        id: randomUUID(),
        accountId: home.currentId,
        on: "2026-09-10",
        amountMinor: 5_000,
      }),
      expense(randomUUID(), "2026-09-20", -500),
    ]);
    await push([expense(randomUUID(), "2026-09-05", -300)]);

    expect(await storedBalanceDays(home.currentId)).toEqual(
      await engineBalanceDays(home.currentId),
    );
    expect(await storedBalanceDays(home.currentId)).toEqual([
      { day: "2026-09-01", balanceMinor: -1_000 },
      { day: "2026-09-05", balanceMinor: -1_300 },
      { day: "2026-09-10", balanceMinor: 5_000 },
      { day: "2026-09-20", balanceMinor: 4_500 },
    ]);
  });

  it("moves the Entries to the new date when the date changes", async () => {
    const id = randomUUID();
    await push([expense(id, "2026-09-15", -2_000)]);

    await push([
      mutation("updateTransaction", { id, patch: { date: "2026-10-02" } }),
    ]);

    const [entry] = await db
      .select()
      .from(entries)
      .where(eq(entries.transactionId, id));
    expect(entry.date).toBe("2026-10-02");
  });

  it("sends a soft delete, derived rows included, to the next pull", async () => {
    const id = randomUUID();
    const created = await push([expense(id, "2026-10-01", -700)]);
    const deleted = await push([mutation("deleteTransaction", { id })]);
    expect(deleted.clock).toBe(created.clock + 1);

    const pull = await pullChanges(db, home.householdId, created.clock);
    expect(pull.clock).toBe(deleted.clock);
    expect(pull.tables.transactions).toEqual([
      expect.objectContaining({ id, deletedAt: A_DATE }),
    ]);
    expect(pull.tables.entries).toEqual([
      expect.objectContaining({
        transactionId: id,
        deletedAt: A_DATE,
      }),
    ]);
    expect(pull.tables.accountBalanceDays).toEqual([
      expect.objectContaining({
        day: "2026-10-01",
        deletedAt: A_DATE,
      }),
    ]);
    expect(pull.tables.accounts).toBeUndefined();
  });

  it("sends no rows to a pull from the current clock", async () => {
    const created = await push([expense(randomUUID(), "2026-10-01", -700)]);

    const pull = await pullChanges(db, home.householdId, created.clock);
    expect(pull.clock).toBe(created.clock);
    expect(pull.tables).toEqual({});
  });

  it("restores a transaction with the entries deleted with it", async () => {
    const id = randomUUID();
    await push([expense(id, "2026-10-01", -700)]);
    await push([mutation("deleteTransaction", { id })]);
    await push([mutation("restoreTransaction", { id })]);

    expect(await storedBalanceDays(home.currentId)).toEqual([
      { day: "2026-10-01", balanceMinor: -700 },
    ]);
  });

  it("applies a re-pushed batch once", async () => {
    const batch = [expense(randomUUID(), "2026-10-01", -700)];
    const first = await push(batch);
    const second = await push(batch);

    expect(second).toEqual({
      applied: first.applied,
      rejected: [],
      clock: first.clock,
      effects: new Set(),
    });
    expect(await db.$count(transactions)).toBe(1);
  });

  it("accepts the amount an older client still sends, and ignores it", async () => {
    const id = randomUUID();
    const ruleId = randomUUID();
    const result = await push([
      {
        id: randomUUID(),
        name: "createTransaction",
        args: {
          id,
          kind: "expense",
          date: "2026-10-01",
          amountMinor: -700,
          categoryId: home.groceriesId,
          entries: [
            { id: randomUUID(), accountId: home.currentId, amountMinor: -700 },
          ],
        },
      },
      {
        id: randomUUID(),
        name: "updateTransaction",
        args: { id, patch: { amountMinor: -650, note: "milk" } },
      },
      {
        id: randomUUID(),
        name: "upsertRule",
        args: {
          id: ruleId,
          name: "Weekly shop",
          unit: "week",
          startsOn: "2026-10-20",
          template: {
            kind: "expense",
            amountMinor: -1_000,
            categoryId: home.groceriesId,
            entries: [{ accountId: home.currentId, amountMinor: -1_000 }],
          },
        },
      },
    ]);

    expect(result.rejected).toEqual([]);
    expect(result.applied).toHaveLength(3);
    const [row] = await db
      .select({
        amountMinor: transactions.amountMinor,
        note: transactions.note,
      })
      .from(transactions)
      .where(eq(transactions.id, id));
    expect(row).toEqual({ amountMinor: null, note: "milk" });
    const [rule] = await db.select().from(rules).where(eq(rules.id, ruleId));
    expect(rule.template).not.toHaveProperty("amountMinor");
  });

  it("records who labelled a Transaction: a Member who creates, relabels or reviews it", async () => {
    const created = randomUUID();
    const ai = randomUUID();
    await push([
      expense(created, "2026-10-01", -700),
      expense(ai, "2026-10-02", -800),
    ]);
    await db
      .update(transactions)
      .set({
        labelledBy: "ai",
        aiReason: "Grocer",
        needsReview: true,
        source: "bank",
      })
      .where(eq(transactions.id, ai));
    const labelledBy = async (id: string) => {
      const [row] = await db
        .select({ labelledBy: transactions.labelledBy })
        .from(transactions)
        .where(eq(transactions.id, id));
      return row.labelledBy;
    };
    const update = (patch: Record<string, unknown>) =>
      push([mutation("updateTransaction", { id: ai, patch })]);

    expect(await labelledBy(created)).toBe("member");
    await update({ date: "2026-10-03" });
    expect(await labelledBy(ai)).toBe("ai");
    await update({ needsReview: false });
    expect(await labelledBy(ai)).toBe("member");

    await db
      .update(transactions)
      .set({ labelledBy: "ai", needsReview: false })
      .where(eq(transactions.id, ai));
    await update({ categoryId: home.groceriesId, memberId: home.partnerId });
    expect(await labelledBy(ai)).toBe("member");
  });

  it("marks only the derived rows an update can change", async () => {
    const id = randomUUID();
    const created = await push([expense(id, "2026-10-01", -700)]);
    async function touchesOf(patch: {
      note?: string;
      memberId?: string;
      date?: string;
    }) {
      const touches = new DerivedTouches();
      await withHousehold(db, home.householdId, (scope) =>
        transactionMutations.update(
          {
            scope: { ...scope, version: created.clock + 1 },
            today: "2026-10-10",
            touches,
            actor: "member",
          },
          id,
          patch,
        ),
      );
      return [...touches.accounts];
    }

    expect(await touchesOf({ note: "lunch" })).toEqual([]);
    expect(await touchesOf({ memberId: home.partnerId })).toEqual([]);
    expect(await touchesOf({ date: "2026-09-30" })).toEqual([
      [home.currentId, "2026-09-30"],
    ]);
  });

  it("applies a mutation repeated in one batch once", async () => {
    const create = expense(randomUUID(), "2026-10-01", -700);
    const result = await push([create, create]);

    expect(result.applied).toEqual([create.id, create.id]);
    expect(await db.$count(transactions)).toBe(1);
  });

  it("serialises two concurrent batches", async () => {
    const [a, b] = await Promise.all([
      push([expense(randomUUID(), "2026-10-01", -100)], CLIENT),
      push(
        [expense(randomUUID(), "2026-10-02", -200)],
        "00000000-0000-4000-8000-00000000c002",
      ),
    ]);

    expect([a.clock, b.clock].sort()).toEqual([1, 2]);
    const first = a.clock < b.clock ? a : b;
    const later = await pullChanges(db, home.householdId, first.clock);
    expect(later.tables.transactions).toHaveLength(1);
    const all = await pullChanges(db, home.householdId, 0);
    expect(all.tables.transactions).toHaveLength(2);
    expect(await storedBalanceDays(home.currentId)).toEqual([
      { day: "2026-10-01", balanceMinor: -100 },
      { day: "2026-10-02", balanceMinor: -300 },
    ]);
  });

  it("rejects an update after a delete", async () => {
    const id = randomUUID();
    await push([expense(id, "2026-10-01", -700)]);
    const update = mutation("updateTransaction", {
      id,
      patch: { note: "late" },
    });
    const result = await push([mutation("deleteTransaction", { id }), update]);

    expect(result.rejected).toEqual([
      { id: update.id, reason: "deleted", message: "deleted" },
    ]);
  });

  it("patches only the fields it names", async () => {
    const id = randomUUID();
    await push([expense(id, "2026-10-01", -700)]);
    await push([
      mutation("updateTransaction", { id, patch: { note: "milk" } }),
      mutation("updateTransaction", {
        id,
        patch: { memberId: home.partnerId, tagIds: [home.trainTagId] },
      }),
    ]);
    const [row] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id));
    expect(row).toMatchObject({
      note: "milk",
      memberId: home.partnerId,
      searchText: "grocer milk groceries",
    });
    expect(await db.$count(transactionTags)).toBe(1);
  });

  it("rejects transactions that break the rules", async () => {
    const other = await seedTestHousehold(db, "other");
    const sameAccount = mutation("createTransaction", {
      id: randomUUID(),
      kind: "transfer",
      date: "2026-10-01",
      entries: [
        { id: randomUUID(), accountId: home.currentId, amountMinor: -1 },
        { id: randomUUID(), accountId: home.currentId, amountMinor: 1 },
      ],
    });
    const noCategory = mutation("createTransaction", {
      id: randomUUID(),
      kind: "expense",
      date: "2026-10-01",
      entries: [
        { id: randomUUID(), accountId: home.currentId, amountMinor: -1 },
      ],
    });
    const foreignAccount = expense(
      randomUUID(),
      "2026-10-01",
      -1,
      home,
      other.currentId,
    );
    const fraction = expense(randomUUID(), "2026-10-01", 1.5);

    const result = await push([
      sameAccount,
      noCategory,
      foreignAccount,
      fraction,
    ]);

    expect(result.applied).toEqual([]);
    expect(result.rejected.map((rejection) => rejection.reason)).toEqual([
      "invalid",
      "invalid",
      "invalid",
      "invalid",
    ]);
    expect(result.clock).toBe(0);
  });

  it("forbids writing a row that belongs to another household", async () => {
    const other = await seedTestHousehold(db, "other");
    const theirs = randomUUID();
    await push(
      [expense(theirs, "2026-10-01", -1, other)],
      CLIENT,
      other.householdId,
    );

    const result = await push([
      expense(theirs, "2026-10-01", -1),
      mutation("deleteTransaction", { id: theirs }),
    ]);

    expect(result.rejected.map((rejection) => rejection.reason)).toEqual([
      "forbidden",
      "not_found",
    ]);
  });

  it("skips a valuation equal to the balance and replaces one on the same day", async () => {
    await push([expense(randomUUID(), "2026-10-01", -700)]);
    await push([
      mutation("putValuation", {
        id: randomUUID(),
        accountId: home.currentId,
        on: "2026-10-05",
        amountMinor: -700,
      }),
    ]);
    expect(await db.$count(valuations)).toBe(0);

    const valuationId = randomUUID();
    await push([
      mutation("putValuation", {
        id: valuationId,
        accountId: home.currentId,
        on: "2026-10-05",
        amountMinor: 1_000,
      }),
      mutation("putValuation", {
        id: randomUUID(),
        accountId: home.currentId,
        on: "2026-10-05",
        amountMinor: 1_200,
      }),
    ]);
    const rows = await db.select().from(valuations);
    expect(rows).toEqual([
      expect.objectContaining({ id: valuationId, amountMinor: 1_200 }),
    ]);
    expect(await storedBalanceDays(home.currentId)).toEqual([
      { day: "2026-10-01", balanceMinor: -700 },
      { day: "2026-10-05", balanceMinor: 1_200 },
    ]);
  });

  it("merges a payee into another", async () => {
    const id = randomUUID();
    const otherPayeeId = randomUUID();
    await push([
      mutation("upsertPayee", {
        id: otherPayeeId,
        name: "Corner Shop",
      }),
      {
        ...expense(id, "2026-10-01", -300),
        args: {
          ...expense(id, "2026-10-01", -300).args,
          payeeId: otherPayeeId,
        },
      },
    ]);
    const result = await push([
      mutation("mergePayee", { fromId: otherPayeeId, intoId: home.grocerId }),
    ]);

    expect(result.rejected).toEqual([]);
    const [moved] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id));
    expect(moved).toMatchObject({
      payeeId: home.grocerId,
      searchText: "grocer groceries",
    });
    const [merged] = await db
      .select()
      .from(payees)
      .where(eq(payees.id, otherPayeeId));
    expect(merged).toMatchObject({
      mergedIntoId: home.grocerId,
      deletedAt: A_DATE,
    });
  });

  it("confirms and skips Expected transactions", async () => {
    const confirmed = randomUUID();
    const skipped = randomUUID();
    const expected = (id: string) => ({
      ...expense(id, "2026-10-08", -900),
      args: {
        ...expense(id, "2026-10-08", -900).args,
        status: "expected" as const,
      },
    });
    await push([expected(confirmed), expected(skipped)]);
    expect(await storedBalanceDays(home.currentId)).toEqual([]);

    await push([
      mutation("confirmExpected", {
        id: confirmed,
        patch: {
          entries: [
            { id: randomUUID(), accountId: home.currentId, amountMinor: -950 },
          ],
        },
      }),
      mutation("skipExpected", { id: skipped }),
    ]);

    expect(await storedBalanceDays(home.currentId)).toEqual([
      { day: "2026-10-08", balanceMinor: -950 },
    ]);
    const [skippedRow] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, skipped));
    expect(skippedRow.deletedAt).not.toBeNull();
  });

  it("keeps an account in a group of its side", async () => {
    const result = await push([
      mutation("upsertAccount", {
        id: randomUUID(),
        groupId: home.liquidGroupId,
        name: "Mortgage",
        kind: "loan",
        currency: "GBP",
      }),
      mutation("upsertAccount", { id: home.cardId, name: "Visa" }),
    ]);
    expect(result.rejected.map((rejection) => rejection.reason)).toEqual([
      "invalid",
    ]);
    expect(result.applied).toHaveLength(1);
  });
});
