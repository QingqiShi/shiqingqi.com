import { randomUUID } from "node:crypto";
import { MockLanguageModelV3 } from "ai/test";
import { and, asc, eq, isNull } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createLabellingModel,
  type ModelAnswer,
  type PromptRow,
} from "../ai/testing/create-labelling-model.ts";
import { valuationRepository } from "../db/repositories/valuation-repository.ts";
import {
  accounts,
  bankLinks,
  bankTransactions,
  entries,
  monthTotals,
  payees,
  transactions,
} from "../db/schema.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import { mutation } from "../db/testing/mutation.ts";
import {
  seedTestHousehold,
  type SeededHousehold,
} from "../db/testing/seed-test-household.ts";
import { withHousehold } from "../db/with-household.ts";
import { nameBasedUuid } from "../ids/name-based-uuid.ts";
import { loadReportSource } from "../reports/load-report-source.ts";
import { applyMutations } from "../sync/apply-mutations.ts";
import {
  createFakeBankClient,
  type FakeBankFixture,
} from "./lunchflow/create-fake-bank-client.ts";
import { processBankRows } from "./process-bank-rows.ts";
import { syncBankLinks } from "./sync-bank-links.ts";
import {
  providerAccount,
  providerRow,
  seedBankLink,
  seedUncategorised,
} from "./testing/seed-bank-link.ts";

const NOW = new Date("2026-10-10T12:00:00Z");
const CLIENT = "00000000-0000-4000-8000-00000000c002";

let db: TestDb;
let home: SeededHousehold;
let uncategorised: { expense: string; income: string };
let currentLinkId: string;
let savingsLinkId: string;
let loanId: string;
let receivableId: string;
let usdId: string;

beforeEach(async () => {
  db = await createTestDb();
  home = await seedTestHousehold(db);
  uncategorised = await seedUncategorised(db, home);
  currentLinkId = await seedBankLink(db, home, {
    accountId: home.currentId,
    providerAccountId: "acc-current",
  });
  savingsLinkId = await seedBankLink(db, home, {
    accountId: home.savingsId,
    providerAccountId: "acc-savings",
  });
  [loanId, receivableId, usdId] = [randomUUID(), randomUUID(), randomUUID()];
  await db.insert(accounts).values([
    {
      id: loanId,
      householdId: home.householdId,
      groupId: home.creditGroupId,
      name: "Mortgage",
      kind: "loan",
      currency: "GBP",
      version: 0,
    },
    {
      id: receivableId,
      householdId: home.householdId,
      groupId: home.liquidGroupId,
      name: "Owed by Sam",
      kind: "receivable",
      currency: "GBP",
      version: 0,
    },
    {
      id: usdId,
      householdId: home.householdId,
      groupId: home.liquidGroupId,
      name: "Dollar account",
      kind: "cash",
      currency: "USD",
      version: 0,
    },
  ]);
});

afterEach(async () => {
  await db.close();
});

/** Stores a bank row as a sync leaves it when nothing matched: `new`. */
async function addBankRow(
  linkId: string,
  providerTxId: string,
  date: string,
  amountMinor: number,
  description: string,
) {
  const id = nameBasedUuid(`bank-transaction:${linkId}:${providerTxId}`);
  await db.insert(bankTransactions).values({
    id,
    householdId: home.householdId,
    linkId,
    providerTxId,
    date,
    amountMinor,
    currency: "GBP",
    description,
    raw: {},
    version: 0,
  });
  return id;
}

function transactionIdOf(linkId: string, providerTxId: string) {
  return nameBasedUuid(`bank:${linkId}:${providerTxId}`);
}

function process(
  model: MockLanguageModelV3 | null,
  options: { deadline?: Date } = {},
) {
  return processBankRows({
    db,
    householdId: home.householdId,
    model,
    now: NOW,
    deadline: options.deadline ?? new Date(Date.now() + 60_000),
  });
}

/** A model that answers each row by its description. */
function modelFor(answers: Record<string, ModelAnswer | null>) {
  return createLabellingModel(
    (row: PromptRow) => answers[row.description] ?? null,
  );
}

async function transactionById(id: string) {
  const [row] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, id));
  return row;
}

async function entriesOf(transactionId: string) {
  return db
    .select({
      accountId: entries.accountId,
      amountMinor: entries.amountMinor,
    })
    .from(entries)
    .where(
      and(eq(entries.transactionId, transactionId), isNull(entries.deletedAt)),
    )
    .orderBy(asc(entries.amountMinor));
}

async function bankRowById(id: string) {
  const [row] = await db
    .select()
    .from(bankTransactions)
    .where(eq(bankTransactions.id, id));
  return row;
}

async function linkById(id: string) {
  const [row] = await db.select().from(bankLinks).where(eq(bankLinks.id, id));
  return row;
}

function balances(accountIds: readonly string[]) {
  return withHousehold(db, home.householdId, (scope) =>
    Promise.all(
      accountIds.map((id) =>
        valuationRepository.balanceAt(scope, id, "2026-10-10"),
      ),
    ),
  );
}

function push(mutations: ReturnType<typeof mutation>[]) {
  return applyMutations(
    db,
    home.householdId,
    { clientId: CLIENT, mutations },
    NOW,
  );
}

/** Whether each Transaction is in Review today, as the weekly Report counts it. */
async function inReviewById() {
  const source = await withHousehold(db, home.householdId, (scope) =>
    loadReportSource(
      scope,
      { transactionsFrom: null, to: "2026-10-10" },
      "2026-10-10",
    ),
  );
  const ids = await db
    .select({ id: transactions.id })
    .from(transactions)
    .orderBy(asc(transactions.date));
  return new Map(
    ids.map(({ id }, index) => [id, source.transactions[index].inReview]),
  );
}

/** Syncs the savings link with these bank rows; the current link has none. */
function syncSavings(
  rows: readonly { id: string; date: string; amountMinor: number }[],
) {
  const fixture: FakeBankFixture = {
    accounts: [providerAccount("acc-current"), providerAccount("acc-savings")],
    transactions: {
      "acc-current": [],
      "acc-savings": rows.map((row) =>
        providerRow(row.id, row.date, row.amountMinor, "FROM CURRENT"),
      ),
    },
    balances: {
      "acc-current": { amountMinor: 0, currency: "GBP" },
      "acc-savings": { amountMinor: 0, currency: "GBP" },
    },
  };
  return syncBankLinks({
    db,
    householdId: home.householdId,
    client: createFakeBankClient(fixture),
    now: NOW,
  });
}

describe("processBankRows", () => {
  it("writes an expense with the model's labels and reason, and a new Payee", async () => {
    const tesco = await addBankRow(
      currentLinkId,
      "t1",
      "2026-10-08",
      -1234,
      "TESCO STORES 3297",
    );
    await addBankRow(currentLinkId, "t2", "2026-10-09", -2150, "ODD SHOP");
    const model = modelFor({
      "TESCO STORES 3297": {
        categoryId: home.groceriesId,
        payeeId: home.grocerId,
        tagIds: [home.trainTagId],
        memberId: home.partnerId,
        reason: "Grocer is groceries in past transactions",
      },
      "ODD SHOP": {
        categoryId: home.groceriesId,
        newPayeeName: `Odd\u0000 ‮ Shop ${"x".repeat(500)}`,
        reason: "First time at this shop",
        needsReview: true,
      },
    });

    const summary = await process(model);

    expect(summary.createdByAccount.get(home.currentId)).toBe(2);
    expect(model.doGenerateCalls).toHaveLength(1);
    const grocer = await transactionById(transactionIdOf(currentLinkId, "t1"));
    expect(grocer).toMatchObject({
      kind: "expense",
      amountMinor: -1234,
      categoryId: home.groceriesId,
      payeeId: home.grocerId,
      memberId: home.partnerId,
      source: "bank",
      labelledBy: "ai",
      aiReason: "Grocer is groceries in past transactions",
      needsReview: false,
      note: "TESCO STORES 3297",
    });
    const odd = await transactionById(transactionIdOf(currentLinkId, "t2"));
    expect(odd).toMatchObject({ needsReview: true, labelledBy: "ai" });
    const [newPayee] = await db
      .select()
      .from(payees)
      .where(eq(payees.id, odd.payeeId ?? ""));
    expect(newPayee.name.startsWith("Odd Shop x")).toBe(true);
    expect(newPayee.name.length).toBeLessThanOrEqual(80);
    expect(await bankRowById(tesco)).toMatchObject({
      state: "matched",
      transactionId: grocer.id,
    });
  });

  it("reuses a Payee whose name differs only in case, punctuation or accents, and makes a new name once per batch", async () => {
    await addBankRow(currentLinkId, "p1", "2026-10-07", -500, "GROCER 12");
    await addBankRow(currentLinkId, "p2", "2026-10-08", -600, "M&S 1");
    await addBankRow(currentLinkId, "p3", "2026-10-09", -700, "M AND S 2");
    await addBankRow(currentLinkId, "p4", "2026-10-09", -800, "REF 123");
    await addBankRow(currentLinkId, "p5", "2026-10-09", -900, "REF 456");
    const model = modelFor({
      "GROCER 12": { categoryId: home.groceriesId, newPayeeName: " grocér. " },
      "M&S 1": {
        categoryId: home.groceriesId,
        newPayeeName: "Marks & Spencer",
      },
      "M AND S 2": {
        categoryId: home.groceriesId,
        newPayeeName: "MARKS AND SPENCER",
      },
      "REF 123": { categoryId: home.groceriesId, newPayeeName: "" },
      "REF 456": { categoryId: home.groceriesId, newPayeeName: " - " },
    });

    await process(model);

    const payeeOf = async (providerTxId: string) =>
      (await transactionById(transactionIdOf(currentLinkId, providerTxId)))
        .payeeId;
    expect(await payeeOf("p1")).toBe(home.grocerId);
    const marks = await payeeOf("p2");
    expect(marks).not.toBeNull();
    expect(await payeeOf("p3")).toBe(marks);
    expect(await payeeOf("p4")).toBeNull();
    expect(await payeeOf("p5")).toBeNull();
    const names = await db
      .select({ name: payees.name })
      .from(payees)
      .orderBy(asc(payees.name));
    expect(names.map(({ name }) => name)).toEqual([
      "Employer",
      "Grocer",
      "Marks & Spencer",
    ]);
  });

  it("writes a mortgage payment that pays down the loan, and an income that pays back money owed", async () => {
    await addBankRow(currentLinkId, "m1", "2026-10-01", -150_000, "MORTGAGE");
    await addBankRow(currentLinkId, "s1", "2026-10-02", 3_000, "SAM REPAYS");
    const model = modelFor({
      MORTGAGE: {
        categoryId: home.groceriesId,
        paysDownAccountId: loanId,
      },
      "SAM REPAYS": {
        kind: "income",
        categoryId: home.salaryId,
        paysDownAccountId: receivableId,
      },
    });

    await process(model);

    const mortgage = transactionIdOf(currentLinkId, "m1");
    expect(await transactionById(mortgage)).toMatchObject({
      kind: "expense",
      amountMinor: -150_000,
    });
    expect(await entriesOf(mortgage)).toEqual([
      { accountId: home.currentId, amountMinor: -150_000 },
      { accountId: loanId, amountMinor: 150_000 },
    ]);
    const repaid = transactionIdOf(currentLinkId, "s1");
    expect(await transactionById(repaid)).toMatchObject({
      kind: "income",
      amountMinor: 3_000,
    });
    expect(await entriesOf(repaid)).toEqual([
      { accountId: receivableId, amountMinor: -3_000 },
      { accountId: home.currentId, amountMinor: 3_000 },
    ]);
  });

  it("writes a transfer to a known account, and links that account's row when it arrives", async () => {
    await addBankRow(currentLinkId, "c1", "2026-10-05", -50_000, "TO SAVINGS");
    await process(
      modelFor({
        "TO SAVINGS": { kind: "transfer", transferAccountId: home.savingsId },
      }),
    );
    const transfer = transactionIdOf(currentLinkId, "c1");
    expect(await transactionById(transfer)).toMatchObject({
      kind: "transfer",
      amountMinor: 0,
      categoryId: null,
    });
    expect(await entriesOf(transfer)).toEqual([
      { accountId: home.currentId, amountMinor: -50_000 },
      { accountId: home.savingsId, amountMinor: 50_000 },
    ]);

    const savingsRow = await addBankRow(
      savingsLinkId,
      "s1",
      "2026-10-06",
      50_000,
      "FROM CURRENT",
    );
    const model = modelFor({});
    await process(model);

    expect(model.doGenerateCalls).toHaveLength(0);
    expect(await bankRowById(savingsRow)).toMatchObject({
      state: "matched",
      transactionId: transfer,
    });
    expect(await db.$count(transactions)).toBe(1);
  });

  it("writes one transfer for two rows of one batch that are its two sides", async () => {
    const out = await addBankRow(
      currentLinkId,
      "c1",
      "2026-10-05",
      -20_000,
      "TRANSFER OUT",
    );
    const into = await addBankRow(
      savingsLinkId,
      "s1",
      "2026-10-05",
      20_000,
      "TRANSFER IN",
    );
    const model = createLabellingModel((row) =>
      row.description === "TRANSFER OUT"
        ? { kind: "transfer", pairRef: "2" }
        : { kind: "transfer", pairRef: "1" },
    );

    const summary = await process(model);

    const transfer = transactionIdOf(currentLinkId, "c1");
    expect(await entriesOf(transfer)).toEqual([
      { accountId: home.currentId, amountMinor: -20_000 },
      { accountId: home.savingsId, amountMinor: 20_000 },
    ]);
    expect((await bankRowById(out)).transactionId).toBe(transfer);
    expect((await bankRowById(into)).transactionId).toBe(transfer);
    expect(await db.$count(transactions)).toBe(1);
    expect(summary.createdByAccount.get(home.currentId)).toBe(1);
  });

  it("puts money to an unknown account In transit, leaving spending and net worth as they were, then settles it", async () => {
    await addBankRow(currentLinkId, "c1", "2026-10-05", -50_000, "TO SOMEONE");
    const before = await balances([home.currentId, home.savingsId]);

    await process(
      modelFor({ "TO SOMEONE": { kind: "transfer", transferUnknown: true } }),
    );

    const transfer = transactionIdOf(currentLinkId, "c1");
    const [inTransit] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.isSystem, true));
    expect(await entriesOf(transfer)).toEqual([
      { accountId: home.currentId, amountMinor: -50_000 },
      { accountId: inTransit.id, amountMinor: 50_000 },
    ]);
    expect(await db.select().from(monthTotals)).toEqual([]);
    const total = (values: number[]) => values.reduce((a, b) => a + b, 0);
    const middle = await balances([
      home.currentId,
      home.savingsId,
      inTransit.id,
    ]);
    expect(total(middle)).toBe(total(before));

    const [, savings] = await syncSavings([
      { id: "s1", date: "2026-10-06", amountMinor: 50_000 },
    ]);

    expect(savings).toMatchObject({ linked: 1, pending: 0 });
    expect(await entriesOf(transfer)).toEqual([
      { accountId: home.currentId, amountMinor: -50_000 },
      { accountId: home.savingsId, amountMinor: 50_000 },
    ]);
    const after = await balances([
      home.currentId,
      home.savingsId,
      inTransit.id,
    ]);
    expect(after).toEqual([-50_000, 50_000, 0]);
  });

  it("puts a transfer to an account in another currency In transit, for Review", async () => {
    await addBankRow(currentLinkId, "c1", "2026-10-05", -10_000, "TO USD");

    await process(
      modelFor({ "TO USD": { kind: "transfer", transferAccountId: usdId } }),
    );

    const transfer = transactionIdOf(currentLinkId, "c1");
    expect(await transactionById(transfer)).toMatchObject({
      kind: "transfer",
      needsReview: true,
    });
    const accountIds = (await entriesOf(transfer)).map(
      (entry) => entry.accountId,
    );
    expect(accountIds).not.toContain(usdId);
  });

  it("asks again after an unusable answer, and writes Uncategorised for Review after three", async () => {
    const row = await addBankRow(
      currentLinkId,
      "c1",
      "2026-10-05",
      -700,
      "MYSTERY",
    );
    const model = modelFor({
      MYSTERY: { categoryId: home.salaryId },
    });

    await process(model);

    expect(model.doGenerateCalls).toHaveLength(3);
    expect(
      await transactionById(transactionIdOf(currentLinkId, "c1")),
    ).toMatchObject({
      kind: "expense",
      categoryId: uncategorised.expense,
      payeeId: null,
      needsReview: true,
      labelledBy: "ai",
      aiReason: null,
      note: "MYSTERY",
    });
    expect(await bankRowById(row)).toMatchObject({
      state: "matched",
      labelAttempts: 3,
    });
  });

  it("leaves the rows new with one more try when the model fails", async () => {
    const row = await addBankRow(currentLinkId, "c1", "2026-10-05", -700, "X");
    const errors: unknown[] = [];
    const model = new MockLanguageModelV3({
      doGenerate: () => Promise.reject(new Error("overloaded")),
    });

    await processBankRows({
      db,
      householdId: home.householdId,
      model,
      now: NOW,
      deadline: new Date(Date.now() + 60_000),
      onModelError: (error) => errors.push(error),
    });

    expect(errors).toHaveLength(1);
    expect(await bankRowById(row)).toMatchObject({
      state: "new",
      labelAttempts: 1,
    });
    expect(await db.$count(transactions)).toBe(0);
  });

  it("notes no balance difference for a link whose rows still wait after the run, and compares once they are written", async () => {
    const tried = await addBankRow(
      currentLinkId,
      "c1",
      "2026-10-05",
      -1000,
      "TRIED",
    );
    await db
      .update(bankTransactions)
      .set({ labelAttempts: 3 })
      .where(eq(bankTransactions.id, tried));
    await addBankRow(currentLinkId, "c2", "2026-10-06", -700, "WAITING");
    await db
      .update(bankLinks)
      .set({ bankBalanceMinor: -1700, bankBalanceOn: "2026-10-10" })
      .where(eq(bankLinks.id, currentLinkId));
    const model = new MockLanguageModelV3({
      doGenerate: () => Promise.reject(new Error("overloaded")),
    });

    await process(model);

    expect(await db.$count(transactions)).toBe(1);
    expect(await linkById(currentLinkId)).toMatchObject({
      balanceDifferenceMinor: null,
    });
    await process(null);
    expect(await linkById(currentLinkId)).toMatchObject({
      balanceDifferenceMinor: null,
    });
    await db
      .update(bankLinks)
      .set({ bankBalanceMinor: -1500 })
      .where(eq(bankLinks.id, currentLinkId));
    await addBankRow(currentLinkId, "c3", "2026-10-07", 0, "ZERO");
    await addBankRow(currentLinkId, "c4", "2026-10-07", -100, "LAST");
    await process(null);
    expect(await linkById(currentLinkId)).toMatchObject({
      balanceDifferenceMinor: 300,
    });
  });

  it("writes Uncategorised for Review when there is no model, and changes nothing when run again", async () => {
    await addBankRow(currentLinkId, "c1", "2026-10-05", 4_000, "REFUND?");

    await process(null);
    const first = await db.select().from(transactions);
    await process(null);

    expect(first).toMatchObject([
      {
        kind: "income",
        categoryId: uncategorised.income,
        needsReview: true,
        labelledBy: "ai",
      },
    ]);
    expect(await db.select().from(transactions)).toEqual(first);
  });

  it("starts no batch after the deadline", async () => {
    const row = await addBankRow(currentLinkId, "c1", "2026-10-05", -700, "X");
    const model = modelFor({ X: { categoryId: home.groceriesId } });

    await process(model, { deadline: new Date(Date.now() - 1) });

    expect(model.doGenerateCalls).toHaveLength(0);
    expect((await bankRowById(row)).state).toBe("new");
  });

  it("links a row that a Transaction written since the sync matches, and does not label it", async () => {
    const row = await addBankRow(
      currentLinkId,
      "c1",
      "2026-10-05",
      -900,
      "GYM",
    );
    const manualId = randomUUID();
    await push([
      mutation("createTransaction", {
        id: manualId,
        kind: "expense",
        date: "2026-10-04",
        amountMinor: -900,
        categoryId: home.groceriesId,
        entries: [
          { id: randomUUID(), accountId: home.currentId, amountMinor: -900 },
        ],
      }),
    ]);
    const model = modelFor({ GYM: { categoryId: home.groceriesId } });

    await process(model);

    expect(model.doGenerateCalls).toHaveLength(0);
    expect(await bankRowById(row)).toMatchObject({
      state: "matched",
      transactionId: manualId,
    });
  });

  it("puts money In transit for more than five days in Review without a flag, and takes it out when a bank row settles it", async () => {
    await addBankRow(currentLinkId, "c1", "2026-10-04", -1_000, "AWAY");
    await addBankRow(currentLinkId, "c2", "2026-10-05", -2_000, "AWAY TOO");
    const unknown: ModelAnswer = { kind: "transfer", transferUnknown: true };
    await process(modelFor({ AWAY: unknown, "AWAY TOO": unknown }));
    const away = transactionIdOf(currentLinkId, "c1");
    const awayToo = transactionIdOf(currentLinkId, "c2");

    expect(await inReviewById()).toEqual(
      new Map([
        [away, true],
        [awayToo, false],
      ]),
    );
    expect((await transactionById(away)).needsReview).toBe(false);

    await syncSavings([{ id: "s1", date: "2026-10-06", amountMinor: 1_000 }]);

    expect(await inReviewById()).toEqual(
      new Map([
        [away, false],
        [awayToo, false],
      ]),
    );
  });

  it("keeps the AI's Review flag when a bank row settles its In transit Entry", async () => {
    await addBankRow(currentLinkId, "c1", "2026-10-05", -1_000, "ODD");
    await process(
      modelFor({
        ODD: {
          kind: "transfer",
          transferUnknown: true,
          needsReview: true,
          reason: "Not sure this is a transfer",
        },
      }),
    );

    await syncSavings([{ id: "s1", date: "2026-10-06", amountMinor: 1_000 }]);

    const transfer = transactionIdOf(currentLinkId, "c1");
    expect(await entriesOf(transfer)).toEqual([
      { accountId: home.currentId, amountMinor: -1_000 },
      { accountId: home.savingsId, amountMinor: 1_000 },
    ]);
    expect(await transactionById(transfer)).toMatchObject({
      needsReview: true,
      aiReason: "Not sure this is a transfer",
    });
  });
});
