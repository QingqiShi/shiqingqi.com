import { describe, expect, it } from "vitest";
import { ruleTemplateSchema } from "../../rules/rule-template-schema.ts";
import { importId } from "./import-id.ts";
import { mapMoneyThings } from "./map-money-things.ts";
import { mapOptionsFor } from "./map-options-for.ts";
import { readSourceRows } from "./read-source-rows.ts";
import { splitOwnerPrefix } from "./split-owner-prefix.ts";
import {
  createFixtureStore,
  FIXTURE_MANIFEST,
  IDS,
} from "./testing/create-fixture-store.ts";
import type { TransactionRow } from "./types.ts";
import { verifyImport } from "./verify-import.ts";

function mapFixture() {
  const db = createFixtureStore();
  const source = readSourceRows(db, FIXTURE_MANIFEST);
  db.close();
  const options = mapOptionsFor(source, {
    groupOverrides: { Cottage: "property" },
    memberNames: { husband: "Alex", wife: "Sam" },
  });
  return { source, options, ...mapMoneyThings(source, options) };
}

const fixture = mapFixture();
const { rows, options } = fixture;
const id = {
  account: (sourceId: string) => importId("account", sourceId),
  transaction: (sourceId: string) => importId("transaction", sourceId),
  category: (sourceId: string) => importId("category", sourceId),
};

function account(sourceId: string) {
  const found = rows.accounts.find((a) => a.id === id.account(sourceId));
  if (!found) throw new Error(`No account ${sourceId}`);
  return found;
}

function transaction(sourceId: string) {
  return rows.transactions.find((t) => t.id === id.transaction(sourceId));
}

function entriesOf(sourceId: string) {
  return rows.entries
    .filter((e) => e.transactionId === id.transaction(sourceId))
    .map((e) => ({
      account: rows.accounts.find((a) => a.id === e.accountId)?.name,
      amount: e.amountMinor,
    }));
}

function valuationsOf(sourceId: string) {
  return rows.valuations
    .filter((v) => v.accountId === id.account(sourceId))
    .map((v) => `${v.on} ${String(v.amountMinor)}`)
    .sort();
}

describe("importId", () => {
  it("gives the same id to the same source key on every run", () => {
    expect(mapFixture().rows.transactions.map((t) => t.id)).toEqual(
      rows.transactions.map((t) => t.id),
    );
  });
});

describe("splitOwnerPrefix", () => {
  it("takes the owner from a 老公 or 老婆 prefix", () => {
    expect(splitOwnerPrefix("老公 Bank")).toEqual({
      owner: "husband",
      name: "Bank",
    });
    expect(splitOwnerPrefix("老婆Savings")).toEqual({
      owner: "wife",
      name: "Savings",
    });
  });

  it("keeps a prefix that runs into Chinese text as part of the name", () => {
    expect(splitOwnerPrefix("老婆婆的钱")).toEqual({
      owner: null,
      name: "老婆婆的钱",
    });
    expect(splitOwnerPrefix("Joint Savings")).toEqual({
      owner: null,
      name: "Joint Savings",
    });
  });
});

describe("accounts", () => {
  it("maps sub-accounts and ledgers to accounts with kind, owner and group", () => {
    const groups = new Map(rows.accountGroups.map((g) => [g.id, g.name]));
    const summary = rows.accounts.map((a) => ({
      name: a.name,
      institution: a.institution,
      kind: a.kind,
      currency: a.currency,
      group: groups.get(a.groupId),
      owner:
        a.ownerMemberId === options.memberIds.husband
          ? "husband"
          : a.ownerMemberId === options.memberIds.wife
            ? "wife"
            : null,
      excluded: a.excludedFromNetWorth,
    }));
    expect(summary).toEqual(
      expect.arrayContaining([
        {
          name: "Bank",
          institution: "Bank",
          kind: "cash",
          currency: "GBP",
          group: "流动资产",
          owner: "husband",
          excluded: false,
        },
        {
          name: "Wallet",
          institution: "Wallet",
          kind: "cash",
          currency: "CNY",
          group: "流动资产",
          owner: "husband",
          excluded: false,
        },
        {
          name: "Card",
          institution: "Card",
          kind: "credit",
          currency: "GBP",
          group: "信用",
          owner: "wife",
          excluded: false,
        },
        {
          name: "Cottage",
          institution: "Cottage",
          kind: "property",
          currency: "GBP",
          group: "不动产",
          owner: null,
          excluded: false,
        },
        {
          name: "Mortgage",
          institution: "",
          kind: "loan",
          currency: "GBP",
          group: "不动产负债",
          owner: null,
          excluded: false,
        },
        {
          name: "Loans to friends",
          institution: "",
          kind: "receivable",
          currency: "GBP",
          group: "其他资产",
          owner: null,
          excluded: false,
        },
        {
          name: "Instalments - Laptop",
          institution: "",
          kind: "loan",
          currency: "GBP",
          group: "其他负债",
          owner: null,
          excluded: true,
        },
      ]),
    );
  });

  it("copies the card's limit, statement and due days and payment account", () => {
    expect(account(IDS.cardSub)).toMatchObject({
      creditLimitMinor: 100000,
      statementDay: 4,
      paymentDueDay: 22,
      defaultPaymentAccountId: id.account(IDS.bankSub),
    });
  });

  it("closes a no-longer-used account the day after its last activity", () => {
    expect(account(IDS.oldSub).closedOn).toBe("2026-01-06");
    expect(account(IDS.bankSub).closedOn).toBeNull();
  });
});

describe("valuations", () => {
  it("adds the same-day transactions after an anchor, and the later anchor of a day wins", () => {
    expect(valuationsOf(IDS.bankSub)).toEqual([
      "2000-01-01 10000",
      "2026-01-03 50000",
      "2026-01-08 78000",
    ]);
  });

  it("turns ledger rows without a transaction into running-total valuations", () => {
    expect(valuationsOf(IDS.mortgage)).toEqual([
      "2026-01-01 -100000",
      "2026-01-10 -90550",
    ]);
    expect(valuationsOf(IDS.instalment)).toEqual(["2026-01-02 -30000"]);
  });
});

describe("transactions", () => {
  it("drops placeholders below one minor unit and expected rows past the window", () => {
    expect(transaction("TX-PLACEHOLDER")).toBeUndefined();
    expect(transaction("TX-PENDING-FAR")).toBeUndefined();
    expect(fixture.report.counts).toMatchObject({
      placeholders: 1,
      expectedBeyondWindow: 1,
      droppedLedgerRows: 1,
      templatesWithoutSchedule: 1,
    });
  });

  it("keeps an expected row inside the window, with its rule and loan entry", () => {
    expect(transaction("TX-PENDING-NEAR")).toMatchObject({
      status: "expected",
      ruleId: importId("rule", IDS.cron),
    });
    expect(entriesOf("TX-PENDING-NEAR")).toEqual([
      { account: "Bank", amount: -10000 },
      { account: "Mortgage", amount: 10000 },
    ]);
  });

  it("books the gross expense and its refund as an expense with a positive amount", () => {
    expect(transaction("TX-SHOP")).toMatchObject({
      kind: "expense",
      amountMinor: -10000,
      categoryId: id.category(IDS.wifeSpend),
      memberId: options.memberIds.wife,
    });
    expect(transaction("TX-SHOP-REFUND")).toMatchObject({
      kind: "expense",
      amountMinor: 4000,
      categoryId: id.category(IDS.wifeSpend),
      refundOfId: id.transaction("TX-SHOP"),
    });
  });

  it("joins a transfer pair into one transaction with an entry per currency", () => {
    expect(transaction("TX-IN")).toBeUndefined();
    expect(transaction("TX-OUT")).toMatchObject({
      kind: "transfer",
      amountMinor: 0,
      categoryId: null,
      note: "Top up\nWallet",
    });
    expect(entriesOf("TX-OUT")).toEqual([
      { account: "Bank", amount: -5000 },
      { account: "Wallet", amount: 40000 },
    ]);
  });

  it("adds a loan entry to a repayment and keeps it an expense", () => {
    expect(transaction("TX-MORTGAGE")).toMatchObject({
      kind: "expense",
      amountMinor: -10000,
    });
    expect(entriesOf("TX-MORTGAGE")).toEqual([
      { account: "Bank", amount: -10000 },
      { account: "Mortgage", amount: 10000 },
    ]);
  });

  it("makes lending and its return transfers to the receivable", () => {
    expect(transaction("TX-LEND")).toMatchObject({
      kind: "transfer",
      amountMinor: 0,
      categoryId: null,
    });
    expect(entriesOf("TX-LEND")).toEqual([
      { account: "Bank", amount: -5000 },
      { account: "Loans to friends", amount: 5000 },
    ]);
    expect(transaction("TX-LEND-BACK")).toMatchObject({ kind: "transfer" });
  });

  it("links a not-counted income to the expense it most likely refunds", () => {
    expect(transaction("TX-NOODLE-REFUND")).toMatchObject({
      kind: "expense",
      amountMinor: 2000,
      categoryId: id.category(IDS.grocery),
      refundOfId: id.transaction("TX-AFTER"),
    });
    expect(fixture.report.counts.refundsLinkedByGuess).toBe(1);
  });

  it("keeps a not-counted income with no likely original as an unlinked refund", () => {
    expect(transaction("TX-CASHBACK")).toMatchObject({
      kind: "expense",
      amountMinor: 250,
      categoryId: null,
      refundOfId: null,
    });
    expect(fixture.report.counts.refundsLeftUnlinked).toBe(1);
    expect(rows.categories.map((c) => c.name)).not.toContain("退款");
    expect(rows.categories.map((c) => c.name)).not.toContain("互相转");
  });

  it("keeps a tax refund as income under the other income category", () => {
    for (const sourceId of ["TX-HMRC-REFUND", "TX-TAX-REFUND"]) {
      expect(transaction(sourceId)).toMatchObject({
        kind: "income",
        categoryId: id.category(IDS.otherIncome),
        refundOfId: null,
      });
    }
    expect(transaction("TX-HMRC-REFUND")?.amountMinor).toBe(4000);
    expect(fixture.report.counts.taxRefundsAsIncome).toBe(2);
    expect(
      fixture.report.refundGuesses.map((guess) => guess.refundId),
    ).not.toContain(id.transaction("TX-HMRC-REFUND"));
  });

  it("records the card's FX rate and rounds half to even", () => {
    expect(transaction("TX-FX")?.amountMinor).toBe(-1111);
    expect(
      rows.entries.find((e) => e.transactionId === id.transaction("TX-FX")),
    ).toMatchObject({ amountMinor: -1111, fxRate: 0.741 });
  });

  it("rounds expenses along the year's running total", () => {
    expect(transaction("TX-PREVIOUS-YEAR")?.amountMinor).toBe(0);
    expect(transaction("TX-PREVIOUS-YEAR-2")?.amountMinor).toBe(-1);
  });

  it("trims notes and takes the member from the account owner", () => {
    expect(transaction("TX-SALARY")).toMatchObject({
      kind: "income",
      note: "Pay",
      memberId: options.memberIds.husband,
    });
  });
});

describe("payees and tags", () => {
  it("makes the delivery platform the payee and the restaurant a tag", () => {
    const after = transaction("TX-AFTER");
    expect(after?.payeeId).toBe(importId("payee", IDS.delivery));
    expect(
      rows.transactionTags
        .filter((t) => t.transactionId === after?.id)
        .map((t) => rows.tags.find((tag) => tag.id === t.tagId)?.name),
    ).toEqual(["Noodle Bar"]);
    expect(rows.payees.map((p) => [p.name, p.note])).toEqual(
      expect.arrayContaining([
        ["Noodle Bar", "食物"],
        ["Courier", "外卖平台"],
      ]),
    );
  });

  it("keeps transport tags as tags and ignores deleted tag ids", () => {
    const later = transaction("TX-LATER");
    expect(later?.payeeId).toBeNull();
    expect(
      rows.transactionTags.filter((t) => t.transactionId === later?.id),
    ).toHaveLength(1);
    expect(fixture.report.unknownTagIds).toEqual(["UNKNOWN-TAG"]);
  });
});

describe("rules and FX", () => {
  it("maps a schedule to a rule whose next day follows the expected window", () => {
    expect(rows.rules).toHaveLength(1);
    expect(rows.rules[0]).toMatchObject({
      name: "Mortgage",
      unit: "month",
      dayOfMonth: 1,
      startsOn: "2026-01-01",
      nextOn: "2026-05-01",
      autoPost: true,
      template: {
        kind: "expense",
        amountMinor: -10000,
        entries: [
          { accountId: id.account(IDS.bankSub), amountMinor: -10000 },
          { accountId: id.account(IDS.mortgage), amountMinor: 10000 },
        ],
      },
    });
    expect(ruleTemplateSchema.parse(rows.rules[0].template)).toEqual(
      rows.rules[0].template,
    );
  });

  it("stores every quote as a rate to the base currency, the latest of a day winning", () => {
    expect(rows.fxRates.map((r) => [r.base, r.quote, r.on, r.rate])).toEqual([
      ["CNY", "GBP", "2026-01-01", 0.1],
      ["CNY", "GBP", "2026-01-05", 0.125],
    ]);
  });
});

describe("verifyImport", () => {
  it("reproduces MoneyThings' net worth, kinds, history and spending", () => {
    const report = verifyImport(rows, fixture.source, {
      baseCurrency: options.baseCurrency,
      timeZone: options.timeZone,
      asOf: options.importDate,
      asOfTime: options.importedAt,
      expectedUntil: options.expectedUntil,
      expectedNetWorthMinor: 30_001_239,
    });
    expect(report.checks.filter((check) => !check.ok)).toEqual([]);
    expect(report.netWorthMinor).toBe(30_001_239);
    expect(
      report.checks.find((check) => check.name === "spending in 2026")?.detail,
    ).toContain("less 22.50 of refunds MoneyThings left out of statistics");
  });

  it("fails when a refund is imported as income", () => {
    const broken = {
      ...rows,
      transactions: rows.transactions.map((t): TransactionRow =>
        t.id === id.transaction("TX-CASHBACK") ? { ...t, kind: "income" } : t,
      ),
    };
    const report = verifyImport(broken, fixture.source, {
      baseCurrency: options.baseCurrency,
      timeZone: options.timeZone,
      asOf: options.importDate,
      asOfTime: options.importedAt,
      expectedUntil: options.expectedUntil,
    });
    expect(
      report.checks.find(
        (check) => check.name === "refunds imported as income",
      ),
    ).toMatchObject({
      ok: false,
      detail:
        "1; tax refunds kept as income: 2026-01-14 40.00, 2026-01-15 1.50",
    });
  });

  it("fails when a balance is wrong", () => {
    const broken = {
      ...rows,
      valuations: rows.valuations.map((v) =>
        v.accountId === id.account(IDS.houseSub)
          ? { ...v, amountMinor: v.amountMinor + 1 }
          : v,
      ),
    };
    const report = verifyImport(broken, fixture.source, {
      baseCurrency: options.baseCurrency,
      timeZone: options.timeZone,
      asOf: options.importDate,
      asOfTime: options.importedAt,
      expectedUntil: options.expectedUntil,
    });
    expect(report.ok).toBe(false);
  });
});
