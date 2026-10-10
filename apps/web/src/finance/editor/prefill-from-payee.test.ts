import { describe, expect, it } from "vitest";
import type { EntryRow, TransactionRow } from "../sync/row-schemas.ts";
import { pickDefaultAccount } from "./pick-default-account.ts";
import { prefillFromPayee } from "./prefill-from-payee.ts";
import { rankPayees } from "./rank-payees.ts";
import { topCategories } from "./top-categories.ts";

const GROCERIES = "c-groceries";
const DINING = "c-dining";
const SALARY = "c-salary";
const CURRENT = "a-current";
const CARD = "a-card";
const CLOSED = "a-closed";

function transaction(
  id: string,
  date: string,
  fields: Partial<TransactionRow> = {},
): TransactionRow {
  return {
    id,
    householdId: "h",
    kind: "expense",
    status: "posted",
    date,
    amountMinor: -1_000,
    categoryId: GROCERIES,
    payeeId: "p-tesco",
    memberId: "m-alex",
    ruleId: null,
    refundOfId: null,
    note: "",
    source: "manual",
    needsReview: false,
    aiConfidence: null,
    searchText: "",
    version: 1,
    createdAt: `${date}T10:00:00.000Z`,
    updatedAt: `${date}T10:00:00.000Z`,
    deletedAt: null,
    ...fields,
  };
}

function entry(transactionId: string, accountId: string): EntryRow {
  return {
    id: `e-${transactionId}`,
    householdId: "h",
    transactionId,
    accountId,
    date: "2026-10-01",
    amountMinor: -1_000,
    fxRate: null,
    position: 0,
    version: 1,
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-01T10:00:00.000Z",
    deletedAt: null,
  };
}

const categoryById = new Map([
  [GROCERIES, { kind: "expense" as const, deletedAt: null }],
  [DINING, { kind: "expense" as const, deletedAt: null }],
  [SALARY, { kind: "income" as const, deletedAt: null }],
]);

describe("prefillFromPayee", () => {
  const history = [
    transaction("t3", "2026-10-05", { categoryId: DINING, memberId: "m-sam" }),
    transaction("t2", "2026-10-01"),
  ];
  const entriesByTransaction = new Map([
    ["t3", [entry("t3", CARD)]],
    ["t2", [entry("t2", CURRENT)]],
  ]);
  const tagIdsByTransaction = new Map([["t3", ["tag-treat"]]]);

  it("copies the last Transaction and marks each copied field", () => {
    const prefill = prefillFromPayee({
      kind: "expense",
      payee: { defaultCategoryId: GROCERIES, defaultAccountId: null },
      history,
      entriesByTransaction,
      tagIdsByTransaction,
      categoryById,
      isUsableAccount: () => true,
      isActiveMember: () => true,
    });
    expect(prefill).toEqual({
      categoryId: DINING,
      accountId: CARD,
      memberId: "m-sam",
      tagIds: ["tag-treat"],
      paysDown: null,
      fromLastTime: new Set(["category", "account", "member", "tags"]),
    });
  });

  it("falls back to the Payee defaults and skips a closed account", () => {
    const prefill = prefillFromPayee({
      kind: "income",
      payee: { defaultCategoryId: SALARY, defaultAccountId: CURRENT },
      history: [transaction("t9", "2026-10-02")],
      entriesByTransaction: new Map([["t9", [entry("t9", CLOSED)]]]),
      tagIdsByTransaction: new Map(),
      categoryById,
      isUsableAccount: (id) => id !== CLOSED,
      isActiveMember: () => true,
    });
    expect(prefill.categoryId).toBe(SALARY);
    expect(prefill.accountId).toBe(CURRENT);
    expect(prefill.fromLastTime).toEqual(new Set(["member"]));
  });

  it("gives nothing for a new Payee", () => {
    expect(
      prefillFromPayee({
        kind: "expense",
        payee: undefined,
        history: [],
        entriesByTransaction: new Map(),
        tagIdsByTransaction: new Map(),
        categoryById,
        isUsableAccount: () => true,
        isActiveMember: () => true,
      }),
    ).toEqual({
      categoryId: null,
      accountId: null,
      memberId: null,
      tagIds: [],
      paysDown: null,
      fromLastTime: new Set(),
    });
  });

  it("copies the loan the last payment also paid down, else the Rule's", () => {
    const MORTGAGE = "a-mortgage";
    const payment = transaction("t5", "2026-10-01", { amountMinor: -100_000 });
    const input = {
      kind: "expense" as const,
      payee: undefined,
      history: [payment],
      tagIdsByTransaction: new Map(),
      categoryById,
      isUsableAccount: () => true,
      isActiveMember: () => true,
    };
    const withLoan = prefillFromPayee({
      ...input,
      entriesByTransaction: new Map([
        [
          "t5",
          [
            { ...entry("t5", CURRENT), amountMinor: -100_000 },
            { ...entry("t5", MORTGAGE), amountMinor: 60_000, position: 1 },
          ],
        ],
      ]),
    });
    expect(withLoan.paysDown).toEqual({
      accountId: MORTGAGE,
      amountMinor: 60_000,
    });
    expect(withLoan.fromLastTime.has("paysDown")).toBe(true);

    const fromRule = prefillFromPayee({
      ...input,
      entriesByTransaction: new Map([["t5", [entry("t5", CURRENT)]]]),
      ruleTemplate: {
        kind: "expense",
        entries: [
          { accountId: CURRENT, amountMinor: -100_000 },
          { accountId: MORTGAGE, amountMinor: 55_000 },
        ],
      },
    });
    expect(fromRule.paysDown).toEqual({
      accountId: MORTGAGE,
      amountMinor: 55_000,
    });
    expect(fromRule.fromLastTime.has("paysDown")).toBe(false);
  });
});

describe("pickDefaultAccount", () => {
  const accounts = [
    { id: CURRENT, kind: "cash" as const, ownerMemberId: "m-sam" },
    { id: CARD, kind: "credit" as const, ownerMemberId: "m-alex" },
    { id: "a-isa", kind: "investment" as const, ownerMemberId: "m-alex" },
  ];

  it("takes the Member's most used spending account", () => {
    expect(
      pickDefaultAccount({
        memberId: "m-alex",
        accounts,
        recent: [
          transaction("t1", "2026-10-03"),
          transaction("t2", "2026-10-02"),
          transaction("t3", "2026-10-01", { memberId: "m-sam" }),
        ],
        entriesByTransaction: new Map([
          ["t1", [entry("t1", CARD)]],
          ["t2", [entry("t2", CARD)]],
          ["t3", [entry("t3", CURRENT)]],
        ]),
      }),
    ).toBe(CARD);
  });

  it("falls back to a cash account", () => {
    expect(
      pickDefaultAccount({
        memberId: "m-alex",
        accounts,
        recent: [],
        entriesByTransaction: new Map(),
      }),
    ).toBe(CURRENT);
  });
});

describe("rankPayees", () => {
  const payees = [
    { id: "1", name: "Tesco Express" },
    { id: "2", name: "Tesco" },
    { id: "3", name: "Deliveroo" },
    { id: "4", name: "Pret A Manger" },
    { id: "5", name: "Ocado" },
  ];
  const lastUsedById = new Map([
    ["1", "2026-10-08"],
    ["2", "2026-09-01"],
    ["3", "2026-10-09"],
    ["4", "2026-10-01"],
  ]);

  it("offers recent Payees with no query", () => {
    expect(
      rankPayees("", payees, { lastUsedById, limit: 3 }).map((p) => p.id),
    ).toEqual(["3", "1", "4"]);
  });

  it("orders prefix, word-prefix, substring and fuzzy matches", () => {
    expect(
      rankPayees("tes", payees, { lastUsedById }).map((p) => p.id),
    ).toEqual(["1", "2"]);
    expect(
      rankPayees("man", payees, { lastUsedById }).map((p) => p.id),
    ).toEqual(["4"]);
    expect(
      rankPayees("cad", payees, { lastUsedById }).map((p) => p.id),
    ).toEqual(["5"]);
    expect(
      rankPayees("dlvr", payees, { lastUsedById }).map((p) => p.id),
    ).toEqual(["3"]);
  });
});

describe("topCategories", () => {
  it("puts the Payee's Categories first, then the most used overall", () => {
    const categories = [
      { id: GROCERIES, kind: "expense" as const },
      { id: DINING, kind: "expense" as const },
      { id: "c-travel", kind: "expense" as const },
      { id: SALARY, kind: "income" as const },
    ];
    const recent = [
      transaction("a", "2026-10-03", { categoryId: GROCERIES }),
      transaction("b", "2026-10-02", { categoryId: GROCERIES }),
      transaction("c", "2026-10-01", { categoryId: "c-travel" }),
    ];
    expect(
      topCategories({
        kind: "expense",
        payeeHistory: [transaction("d", "2026-10-01", { categoryId: DINING })],
        recent,
        categories,
        limit: 3,
      }),
    ).toEqual([DINING, GROCERIES, "c-travel"]);
  });
});
