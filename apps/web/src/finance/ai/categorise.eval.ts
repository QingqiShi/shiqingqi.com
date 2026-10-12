import { wrapLanguageModel } from "ai";
import { and, eq, isNull } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { processBankRows } from "../bank/process-bank-rows.ts";
import {
  accountGroups,
  accounts,
  bankLinks,
  bankTransactions,
  categories,
  connections,
  entries,
  households,
  members,
  payees,
  tags,
  transactions,
} from "../db/schema.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import { nameBasedUuid } from "../ids/name-based-uuid.ts";
import { categoriseFixture } from "./eval/categorise-fixture.ts";
import { getFinanceModel } from "./get-finance-model.ts";

const CATEGORY_THRESHOLD = 0.85;
const PAYEE_THRESHOLD = 0.9;
const TRANSFER_THRESHOLD = 0.9;

/** Claude Sonnet 5.5, US dollars per million tokens. */
const PRICE = { input: 2, cacheWrite: 2.5, cacheRead: 0.2, output: 10 };

const INSTRUCTIONS = `Payments to J SMITH are our rent.
Alex also has an HSBC account that is not in this app; money to or from it is a transfer.`;

const id = (key: string) => nameBasedUuid(`eval:${key}`);
const HOUSEHOLD = id("household");
const categoryId = (key: string) => id(`category:${key}`);
const ACCOUNT = {
  current: id("account:current"),
  savings: id("account:savings"),
  card: id("account:card"),
};
const LINK = {
  current: id("link:current"),
  savings: id("link:savings"),
  card: id("link:card"),
};

interface EvalRow {
  ref: string;
  link: keyof typeof LINK;
  date: string;
  amountMinor: number;
  text: string;
}

function comparable(name: string) {
  return name.toLowerCase().replaceAll(/[^\p{L}\p{N}]/gu, "");
}

function isSamePayee(answer: string, accepted: readonly string[]) {
  const given = comparable(answer);
  if (given === "") return false;
  return accepted.some((name) => {
    const wanted = comparable(name);
    return given === wanted || given.includes(wanted) || wanted.includes(given);
  });
}

async function seed(db: TestDb) {
  await db.insert(households).values({
    id: HOUSEHOLD,
    name: "Eval",
    aiInstructions: INSTRUCTIONS,
  });
  const householdId = HOUSEHOLD;
  const member = id("member");
  await db.insert(members).values({
    id: member,
    householdId,
    name: "Alex",
    role: "owner",
    version: 0,
  });
  await db.insert(accountGroups).values([
    {
      id: id("group:cash"),
      householdId,
      name: "Cash",
      side: "asset",
      version: 0,
    },
    {
      id: id("group:credit"),
      householdId,
      name: "Credit",
      side: "liability",
      version: 0,
    },
  ]);
  await db.insert(accounts).values([
    {
      id: ACCOUNT.current,
      householdId,
      groupId: id("group:cash"),
      ownerMemberId: member,
      name: "Current",
      institution: "Monzo",
      kind: "cash",
      currency: "GBP",
      version: 0,
    },
    {
      id: ACCOUNT.savings,
      householdId,
      groupId: id("group:cash"),
      ownerMemberId: member,
      name: "Savings",
      institution: "Monzo",
      kind: "cash",
      currency: "GBP",
      version: 0,
    },
    {
      id: ACCOUNT.card,
      householdId,
      groupId: id("group:credit"),
      ownerMemberId: member,
      name: "Amex",
      institution: "American Express",
      kind: "credit",
      currency: "GBP",
      paymentDueDay: 5,
      defaultPaymentAccountId: ACCOUNT.current,
      version: 0,
    },
  ]);
  await db.insert(categories).values(
    categoriseFixture.categories.map((category, position) => ({
      id: categoryId(category.key),
      householdId,
      parentId: category.parent ? categoryId(category.parent) : null,
      kind: category.kind,
      name: category.name,
      position,
      isSystem: category.key.startsWith("uncategorised"),
      version: 0,
    })),
  );
  await db.insert(tags).values(
    categoriseFixture.tags.map((name) => ({
      id: id(`tag:${name}`),
      householdId,
      name,
      version: 0,
    })),
  );
  const history = [
    ...categoriseFixture.history.map((past, index) => ({
      ...past,
      date: `2026-09-${String(index + 1).padStart(2, "0")}`,
      labelledBy: "member" as const,
    })),
    {
      payee: "WHSmith",
      category: "entertainment",
      amountMinor: -1299,
      bankText: "WHSMITH 0211",
      date: "2026-08-15",
      labelledBy: "member" as const,
    },
    {
      payee: "WHSmith",
      category: "shopping",
      amountMinor: -650,
      bankText: "WHSMITH 0882",
      date: "2026-09-25",
      labelledBy: "ai" as const,
    },
  ];
  const payeeNames = [...new Set(history.map((past) => past.payee))];
  await db.insert(payees).values(
    payeeNames.map((name) => ({
      id: id(`payee:${name}`),
      householdId,
      name,
      version: 0,
    })),
  );
  await db.insert(connections).values({
    id: id("connection"),
    householdId,
    label: "Lunch Flow",
    version: 0,
  });
  await db.insert(bankLinks).values(
    (["current", "savings", "card"] as const).map((key) => ({
      id: LINK[key],
      householdId,
      connectionId: id("connection"),
      accountId: ACCOUNT[key],
      providerAccountId: key,
      currency: "GBP",
      version: 0,
    })),
  );
  for (const [index, past] of history.entries()) {
    const transactionId = id(`history:${String(index)}`);
    await db.insert(transactions).values({
      id: transactionId,
      householdId,
      kind: "expense",
      date: past.date,
      amountMinor: past.amountMinor,
      categoryId: categoryId(past.category),
      payeeId: id(`payee:${past.payee}`),
      memberId: member,
      source: "bank",
      labelledBy: past.labelledBy,
      version: 0,
    });
    await db.insert(entries).values({
      id: id(`history-entry:${String(index)}`),
      householdId,
      transactionId,
      accountId: ACCOUNT.current,
      date: past.date,
      amountMinor: past.amountMinor,
      version: 0,
    });
    await db.insert(bankTransactions).values({
      id: id(`history-bank:${String(index)}`),
      householdId,
      linkId: LINK.current,
      providerTxId: `history-${String(index)}`,
      date: past.date,
      amountMinor: past.amountMinor,
      currency: "GBP",
      description: past.bankText,
      raw: {},
      state: "matched",
      transactionId,
      version: 0,
    });
  }
}

async function addRows(db: TestDb, rows: readonly EvalRow[]) {
  await db.insert(bankTransactions).values(
    rows.map((row) => ({
      id: id(`row:${row.ref}`),
      householdId: HOUSEHOLD,
      linkId: LINK[row.link],
      providerTxId: row.ref,
      date: row.date,
      amountMinor: row.amountMinor,
      currency: "GBP",
      description: row.text,
      raw: {},
      version: 0,
    })),
  );
}

/** What the run made of a bank row. */
async function outcomeOf(db: TestDb, ref: string) {
  const row = (
    await db
      .select({ transactionId: bankTransactions.transactionId })
      .from(bankTransactions)
      .where(eq(bankTransactions.id, id(`row:${ref}`)))
  ).at(0);
  if (!row?.transactionId) return undefined;
  const [transaction] = await db
    .select({
      id: transactions.id,
      kind: transactions.kind,
      categoryId: transactions.categoryId,
      payee: payees.name,
      reason: transactions.aiReason,
    })
    .from(transactions)
    .leftJoin(payees, eq(payees.id, transactions.payeeId))
    .where(eq(transactions.id, row.transactionId));
  const accountIds = (
    await db
      .select({ accountId: entries.accountId, isSystem: accounts.isSystem })
      .from(entries)
      .innerJoin(accounts, eq(accounts.id, entries.accountId))
      .where(
        and(
          eq(entries.transactionId, row.transactionId),
          isNull(entries.deletedAt),
        ),
      )
  ).map((entry) => (entry.isSystem ? "in-transit" : entry.accountId));
  return { ...transaction, accountIds: accountIds.sort() };
}

describe("Finance labelling (process step, real model)", () => {
  it("labels the synthetic bank rows, follows the instructions, copies a Member's label over an earlier AI guess, and finds each transfer's other side", async () => {
    const base = getFinanceModel();
    if (!base || typeof base === "string") {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    const usage = {
      input: 0,
      cacheWrite: 0,
      cacheRead: 0,
      output: 0,
      calls: 0,
    };
    const model = wrapLanguageModel({
      model: base,
      middleware: {
        wrapGenerate: async ({ doGenerate }) => {
          const result = await doGenerate();
          usage.calls++;
          usage.input += result.usage.inputTokens.noCache ?? 0;
          usage.cacheWrite += result.usage.inputTokens.cacheWrite ?? 0;
          usage.cacheRead += result.usage.inputTokens.cacheRead ?? 0;
          usage.output += result.usage.outputTokens.total ?? 0;
          return result;
        },
      },
    });

    const db = await createTestDb();
    await seed(db);
    const cases = categoriseFixture.cases.map((testCase, index) => ({
      ...testCase,
      ref: `case-${String(index).padStart(2, "0")}`,
      date: `2026-10-0${String((index % 8) + 1)}`,
    }));
    await addRows(db, [
      ...cases.map((testCase) => ({
        ref: testCase.ref,
        link: "current" as const,
        date: testCase.date,
        amountMinor: testCase.amountMinor,
        text: testCase.text,
      })),
      {
        ref: "rent",
        link: "current",
        date: "2026-10-01",
        amountMinor: -120_000,
        text: "J SMITH FLAT 3 OCT",
      },
      {
        ref: "whsmith",
        link: "current",
        date: "2026-10-02",
        amountMinor: -899,
        text: "WHSMITH 0453",
      },
      {
        ref: "card",
        link: "current",
        date: "2026-10-05",
        amountMinor: -45_000,
        text: "AMERICAN EXPRESS PAYMENT",
      },
      {
        ref: "pair-out",
        link: "current",
        date: "2026-10-09",
        amountMinor: -30_000,
        text: "TO SAVINGS POT",
      },
      {
        ref: "pair-in",
        link: "savings",
        date: "2026-10-09",
        amountMinor: 30_000,
        text: "FROM CURRENT ACCOUNT",
      },
      {
        ref: "hsbc",
        link: "current",
        date: "2026-10-09",
        amountMinor: -100_000,
        text: "TFR HSBC UK BANK REF ALEX",
      },
    ]);

    const started = Date.now();
    await processBankRows({
      db,
      householdId: HOUSEHOLD,
      model,
      now: new Date("2026-10-10T12:00:00Z"),
      deadline: new Date(Date.now() + 15 * 60_000),
      onModelError: (error) => {
        console.error("Model call failed", error);
      },
      onUnusableAnswer: (problem) => {
        console.log("Answer refused", problem);
      },
    });
    const seconds = (Date.now() - started) / 1000;

    const misses: string[] = [];
    let categoryHits = 0;
    let payeeHits = 0;
    for (const testCase of cases) {
      const outcome = await outcomeOf(db, testCase.ref);
      const categoryOk = testCase.categories
        .map((key) => categoryId(key))
        .includes(outcome?.categoryId ?? "");
      const payeeOk = isSamePayee(outcome?.payee ?? "", testCase.payees);
      if (categoryOk) categoryHits++;
      if (payeeOk) payeeHits++;
      if (!categoryOk || !payeeOk) {
        misses.push(
          `${testCase.text}: payee "${outcome?.payee ?? "-"}"${categoryOk ? "" : ", wrong category"} (${outcome?.reason ?? "no reason"})`,
        );
      }
    }

    const rent = await outcomeOf(db, "rent");
    const instructionOk = rent?.categoryId === categoryId("rent");
    const whsmith = await outcomeOf(db, "whsmith");
    const aiGuessIgnored = whsmith?.categoryId === categoryId("entertainment");
    const card = await outcomeOf(db, "card");
    const pairOut = await outcomeOf(db, "pair-out");
    const pairIn = await outcomeOf(db, "pair-in");
    const hsbc = await outcomeOf(db, "hsbc");
    const transfers = {
      card:
        card?.kind === "transfer" &&
        card.accountIds.join() ===
          [ACCOUNT.card, ACCOUNT.current].sort().join(),
      pair:
        pairOut?.kind === "transfer" &&
        pairOut.id === pairIn?.id &&
        pairOut.accountIds.join() ===
          [ACCOUNT.current, ACCOUNT.savings].sort().join(),
      unknown:
        hsbc?.kind === "transfer" && hsbc.accountIds.includes("in-transit"),
    };
    const transferHits = Object.values(transfers).filter(Boolean).length;
    for (const [name, outcome] of Object.entries({
      rent,
      whsmith,
      card,
      pairOut,
      pairIn,
      hsbc,
    })) {
      misses.push(
        `${name}: ${outcome?.kind ?? "-"} ${outcome?.accountIds.join("/") ?? ""} (${outcome?.reason ?? "no reason"})`,
      );
    }

    const cost =
      (usage.input * PRICE.input +
        usage.cacheWrite * PRICE.cacheWrite +
        usage.cacheRead * PRICE.cacheRead +
        usage.output * PRICE.output) /
      1_000_000;
    const total = cases.length;
    const report = [
      `category ${String(categoryHits)}/${String(total)}, payee ${String(payeeHits)}/${String(total)}`,
      `instruction ${instructionOk ? "ok" : "missed"}, earlier AI guess ignored ${aiGuessIgnored ? "ok" : "missed"}, transfers ${JSON.stringify(transfers)}`,
      `${String(usage.calls)} model calls in ${seconds.toFixed(0)} s; tokens: input ${String(usage.input)}, cache write ${String(usage.cacheWrite)}, cache read ${String(usage.cacheRead)}, output ${String(usage.output)}; cost $${cost.toFixed(3)}`,
      ...misses,
    ].join("\n");
    console.log(report);
    await db.close();

    expect(categoryHits / total, report).toBeGreaterThanOrEqual(
      CATEGORY_THRESHOLD,
    );
    expect(payeeHits / total, report).toBeGreaterThanOrEqual(PAYEE_THRESHOLD);
    expect(transferHits / 3, report).toBeGreaterThanOrEqual(TRANSFER_THRESHOLD);
    expect(aiGuessIgnored, report).toBe(true);
    expect(instructionOk, report).toBe(true);
  }, 900_000);
});
