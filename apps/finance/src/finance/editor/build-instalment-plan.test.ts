import { randomUUID } from "node:crypto";
import { and, asc, eq, isNull } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  accounts,
  bankLinks,
  connections,
  entries,
  rules,
  transactions,
  valuations,
} from "../db/schema.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import {
  seedTestHousehold,
  type SeededHousehold,
} from "../db/testing/seed-test-household.ts";
import { materialiseRules } from "../rules/materialise-rules.ts";
import { applyMutations } from "../sync/apply-mutations.ts";
import type { EntryRow, TransactionRow } from "../sync/row-schemas.ts";
import {
  buildInstalmentPlan,
  type InstalmentPlanInput,
} from "./build-instalment-plan.ts";

const NOW = new Date("2026-10-10T12:00:00Z");
const STAMPS = {
  version: 1,
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString(),
  deletedAt: null,
};

let db: TestDb;
let home: SeededHousehold;
let purchase: TransactionRow;
let purchaseEntry: EntryRow;

beforeEach(async () => {
  db = await createTestDb();
  home = await seedTestHousehold(db);
  purchase = {
    id: randomUUID(),
    householdId: home.householdId,
    kind: "expense",
    status: "posted",
    date: "2026-10-10",
    categoryId: home.groceriesId,
    payeeId: home.grocerId,
    memberId: home.memberId,
    ruleId: null,
    refundOfId: null,
    note: "Television",
    source: "manual",
    needsReview: false,
    labelledBy: "member",
    aiReason: null,
    searchText: "",
    ...STAMPS,
  };
  purchaseEntry = {
    id: randomUUID(),
    householdId: home.householdId,
    transactionId: purchase.id,
    accountId: home.cardId,
    date: purchase.date,
    amountMinor: -120_000,
    position: 0,
    ...STAMPS,
  };
  await push([
    {
      id: randomUUID(),
      name: "createTransaction",
      args: {
        ...purchase,
        entries: [
          {
            id: purchaseEntry.id,
            accountId: home.cardId,
            amountMinor: -120_000,
          },
        ],
        tagIds: [],
      },
    },
  ]);
});

afterEach(async () => {
  await db.close();
});

async function push(mutations: { id?: string; name: string; args: unknown }[]) {
  const response = await applyMutations(
    db,
    home.householdId,
    {
      clientId: "00000000-0000-4000-8000-00000000c001",
      mutations: mutations.map((mutation) => ({
        ...mutation,
        id: mutation.id ?? randomUUID(),
      })),
    },
    NOW,
  );
  expect(response.rejected).toEqual([]);
}

function plan(overrides: Partial<InstalmentPlanInput> = {}) {
  const result = buildInstalmentPlan({
    transaction: purchase,
    entries: [purchaseEntry],
    tagIds: [],
    months: 12,
    feeMinor: 1_205,
    accountById: new Map([
      [home.cardId, { currency: "GBP", ownerMemberId: home.memberId }],
    ]),
    accounts: [{ groupId: home.creditGroupId, kind: "credit" }],
    groups: [
      { id: home.liquidGroupId, side: "asset", position: 0 },
      { id: home.creditGroupId, side: "liability", position: 1 },
    ],
    names: {
      account: "Instalments · Television",
      rule: "Television",
      group: "Loans",
    },
    createId: randomUUID,
    ...overrides,
  });
  if (!result) throw new Error("Expected a plan");
  return result;
}

function liveEntriesOn(accountId: string) {
  return db
    .select({ date: entries.date, amountMinor: entries.amountMinor })
    .from(entries)
    .innerJoin(transactions, eq(transactions.id, entries.transactionId))
    .where(
      and(
        eq(entries.householdId, home.householdId),
        eq(entries.accountId, accountId),
        isNull(entries.deletedAt),
        eq(transactions.status, "posted"),
      ),
    )
    .orderBy(asc(entries.date));
}

describe("buildInstalmentPlan", () => {
  it("splits the price and the fee into monthly payments that pay the loan off", async () => {
    const result = plan();
    expect(result).toMatchObject({
      totalMinor: 121_205,
      paymentMinor: 10_100,
      firstPaymentMinor: 10_105,
      lastPaymentOn: "2027-09-10",
    });
    await push(result.mutations);
    await materialiseRules(
      db,
      home.householdId,
      new Date("2027-12-01T12:00:00Z"),
    );

    const [loan] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, result.loanAccountId));
    expect(loan).toMatchObject({
      kind: "loan",
      excludedFromNetWorth: true,
      groupId: home.creditGroupId,
    });
    const [opening] = await db
      .select({ on: valuations.on, amountMinor: valuations.amountMinor })
      .from(valuations)
      .where(eq(valuations.accountId, result.loanAccountId));
    expect(opening).toEqual({ on: "2026-10-09", amountMinor: -121_205 });

    const payments = await liveEntriesOn(result.loanAccountId);
    expect(payments).toHaveLength(12);
    expect(payments.at(0)).toEqual({ date: "2026-10-10", amountMinor: 10_105 });
    expect(payments.at(-1)).toEqual({
      date: "2027-09-10",
      amountMinor: 10_100,
    });
    expect(
      opening.amountMinor +
        payments.reduce((sum, payment) => sum + payment.amountMinor, 0),
    ).toBe(0);

    const spent = await liveEntriesOn(home.cardId);
    expect(spent.reduce((sum, entry) => sum + entry.amountMinor, 0)).toBe(
      -121_205,
    );
  });

  it("applies in full when the paying account got a Bank link after the plan was made, with a Rule that makes Expected payments", async () => {
    const result = plan();
    const connectionId = randomUUID();
    await db.insert(connections).values({
      id: connectionId,
      householdId: home.householdId,
      label: "Lunch Flow",
      version: 1,
    });
    await db.insert(bankLinks).values({
      id: randomUUID(),
      householdId: home.householdId,
      connectionId,
      accountId: home.cardId,
      providerAccountId: "provider-card",
      currency: "GBP",
      version: 1,
    });

    await push(result.mutations);

    expect(await db.select({ autoPost: rules.autoPost }).from(rules)).toEqual([
      { autoPost: false },
    ]);
    const [loan] = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.id, result.loanAccountId));
    expect(loan).toBeDefined();
  });

  it("is undone by its Undo mutations", async () => {
    const result = plan();
    await push(result.mutations);
    await push(result.undo);

    const [loan] = await db
      .select({ deletedAt: accounts.deletedAt })
      .from(accounts)
      .where(eq(accounts.id, result.loanAccountId));
    expect(loan.deletedAt).not.toBeNull();
    expect(await liveEntriesOn(home.cardId)).toEqual([
      { date: "2026-10-10", amountMinor: -120_000 },
    ]);
  });
});
