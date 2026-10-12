import { describe, expect, it } from "vitest";
import {
  buildFixtureMemory,
  FIXTURE_ACCOUNT_ID,
} from "./eval/build-fixture-memory.ts";
import { categoriseFixture } from "./eval/categorise-fixture.ts";
import { labelsForBankText } from "./labels-for-bank-text.ts";
import { labelsForPayee } from "./labels-for-payee.ts";
import { matchPayee } from "./match-payee.ts";
import { normaliseBankText } from "./normalise-bank-text.ts";
import { readTagHistory } from "./read-tag-history.ts";
import { scoreTextSimilarity } from "./score-text-similarity.ts";
import { suggestLabelsFromMemory } from "./suggest-labels-from-memory.ts";
import type { LabelMemory, MemoryTransaction } from "./types.ts";
import { withBankTexts } from "./with-bank-texts.ts";

describe("normaliseBankText", () => {
  it.each([
    ["TESCO STORES 3297", "TESCO STORES"],
    ["Tesco Stores 3297 London GB", "TESCO STORES"],
    ["DELIVEROO*KFC", "DELIVEROO KFC"],
    ["  card #12  netflix.com ", "CARD NETFLIX.COM"],
    ["LONDON", "LONDON"],
    ["Sainsbury's", "SAINSBURYS"],
    ["盒马 鲜生", "盒马 鲜生"],
    ["1234", ""],
  ])("%s → %s", (text, expected) => {
    expect(normaliseBankText(text)).toBe(expected);
  });
});

describe("scoreTextSimilarity", () => {
  it("scores word overlap with a bonus for a shared prefix", () => {
    expect(scoreTextSimilarity("TESCO STORES 3297", "Tesco")).toBeCloseTo(0.7);
    expect(scoreTextSimilarity("NETFLIX.COM", "Netflix")).toBeCloseTo(0.7);
    expect(scoreTextSimilarity("TFL TRAVEL CH", "TfL")).toBeCloseTo(1 / 3);
    expect(scoreTextSimilarity("Ocado", "OCADO 123")).toBe(1);
    expect(scoreTextSimilarity("Shell", "Spotify")).toBe(0);
    expect(scoreTextSimilarity("", "Tesco")).toBe(0);
  });
});

function transaction(
  overrides: Partial<MemoryTransaction> & { id: string },
): MemoryTransaction {
  return {
    date: "2026-09-01",
    kind: "expense",
    amountMinor: -1000,
    payeeId: "p-grocer",
    categoryId: "c-groceries",
    memberId: null,
    tagIds: [],
    accountIds: ["a-current"],
    bankTexts: [],
    ...overrides,
  };
}

const memory: LabelMemory = {
  baseCurrency: "GBP",
  aliases: [
    { alias: "LOCAL GROCER", payeeId: "p-grocer" },
    { alias: "OLD SHOP", payeeId: "p-gone" },
  ],
  payees: [
    { id: "p-grocer", name: "Grocer", defaultCategoryId: null },
    { id: "p-cafe", name: "Corner Cafe", defaultCategoryId: "c-coffee" },
    { id: "p-uber-eats", name: "Uber Eats", defaultCategoryId: "c-takeaway" },
  ],
  categories: [],
  tags: [],
  members: [],
  accounts: [
    {
      id: "a-current",
      name: "Current",
      kind: "cash",
      currency: "GBP",
      ownerMemberId: null,
    },
    {
      id: "a-card",
      name: "Card",
      kind: "credit",
      currency: "GBP",
      ownerMemberId: "m-owner",
    },
  ],
  transactions: [
    transaction({ id: "t1", tagIds: ["tag-a"], memberId: "m-2" }),
    transaction({ id: "t2", tagIds: ["tag-a", "tag-b"], memberId: "m-2" }),
    transaction({ id: "t3", tagIds: ["tag-a"], memberId: "m-1" }),
    transaction({ id: "t4", categoryId: "c-eating-out" }),
    transaction({ id: "t6", tagIds: ["tag-a"] }),
    transaction({ id: "t5", payeeId: "p-cafe", categoryId: "c-eating-out" }),
  ],
};

function input(text: string, amountMinor = -500, accountId = "a-current") {
  return { text, amountMinor, date: "2026-10-01", accountId };
}

function recallMemory(transactions: MemoryTransaction[]): LabelMemory {
  return { ...memory, transactions };
}

describe("matchPayee", () => {
  it("finds the Payee of an exact alias", () => {
    expect(matchPayee("LOCAL GROCER 77 LONDON", memory)).toBe("p-grocer");
  });

  it("ignores an alias of a Payee that is gone", () => {
    expect(matchPayee("OLD SHOP", memory)).toBeNull();
  });

  it("never guesses from a Payee name that is only alike", () => {
    expect(matchPayee("CORNER CAFE 12", memory)).toBeNull();
    expect(matchPayee("UBER", memory)).toBeNull();
  });
});

describe("labelsForPayee", () => {
  it("takes the mode, the steady tags and the most common member", () => {
    expect(labelsForPayee("p-grocer", "a-current", memory)).toEqual({
      categoryId: "c-groceries",
      tagIds: ["tag-a"],
      askForTags: false,
      memberId: "m-2",
      confidence: 0.95,
    });
  });

  it("prefers the default category and the account owner", () => {
    expect(labelsForPayee("p-cafe", "a-card", memory)).toEqual({
      categoryId: "c-coffee",
      tagIds: [],
      askForTags: false,
      memberId: "m-owner",
      confidence: 0.7,
    });
  });
});

describe("readTagHistory", () => {
  const tagged = (id: string, tagIds: string[]) => transaction({ id, tagIds });

  it("trusts only a Tag on every recent Transaction, and on two at least", () => {
    expect(
      readTagHistory([
        tagged("t1", ["tag-ride", "tag-late"]),
        tagged("t2", ["tag-ride"]),
        tagged("t3", ["tag-ride"]),
      ]),
    ).toEqual({
      steady: ["tag-ride"],
      varying: new Set(["tag-late"]),
      askForTags: false,
    });
    expect(readTagHistory([tagged("t1", ["tag-ride"])])).toEqual({
      steady: [],
      varying: new Set(),
      askForTags: false,
    });
  });

  it("asks for Tags when nearly every recent Transaction has a Tag that changes", () => {
    const orders = [
      tagged("t1", ["tag-kfc"]),
      tagged("t2", ["tag-thai"]),
      tagged("t3", ["tag-kfc"]),
      tagged("t4", ["tag-pizza"]),
      tagged("t5", []),
    ];
    expect(readTagHistory(orders)).toMatchObject({
      steady: [],
      askForTags: true,
    });
    expect(readTagHistory(orders.slice(0, 2)).askForTags).toBe(false);
    expect(readTagHistory([...orders, tagged("t6", [])]).askForTags).toBe(
      false,
    );
  });
});

describe("labelsForBankText", () => {
  const tfl = (id: string, overrides: Partial<MemoryTransaction> = {}) =>
    transaction({
      id,
      payeeId: null,
      categoryId: "c-commute",
      tagIds: ["tag-train"],
      memberId: "m-1",
      bankTexts: ["TFL TRAVEL CHARGE"],
      ...overrides,
    });

  it("reuses the labels of past bank rows with the same text, also without a Payee", () => {
    expect(
      labelsForBankText(
        input("TFL TRAVEL CHARGE 0123 LONDON"),
        recallMemory([tfl("t1"), tfl("t2")]),
      ),
    ).toEqual({
      suggestion: {
        payeeId: undefined,
        categoryId: "c-commute",
        tagIds: ["tag-train"],
        memberId: "m-1",
        confidence: 0.95,
        source: "bank-text",
      },
      categoryAgrees: true,
    });
  });

  it("gives no Tag that changes between the rows, and none from one row", () => {
    const tube = { tagIds: ["tag-tube"] };
    expect(
      labelsForBankText(
        input("TFL TRAVEL CHARGE"),
        recallMemory([tfl("t1", tube), tfl("t2"), tfl("t3", tube)]),
      )?.suggestion.tagIds,
    ).toEqual([]);
    expect(
      labelsForBankText(input("TFL TRAVEL CHARGE"), recallMemory([tfl("t1")]))
        ?.suggestion.tagIds,
    ).toEqual([]);
  });

  it("asks for Tags when the user nearly always adds one that changes", () => {
    const order = (id: string, tagId: string) =>
      transaction({
        id,
        payeeId: "p-uber-eats",
        categoryId: "c-takeaway",
        tagIds: [tagId],
        bankTexts: ["UBER EATS"],
      });
    expect(
      labelsForBankText(
        input("UBER EATS"),
        recallMemory([
          order("t1", "tag-kfc"),
          order("t2", "tag-thai"),
          order("t3", "tag-kfc"),
        ]),
      ),
    ).toMatchObject({
      suggestion: {
        payeeId: "p-uber-eats",
        categoryId: "c-takeaway",
        tagIds: [],
        confidence: 0.95,
        askForTags: true,
      },
      categoryAgrees: true,
    });
  });

  it("takes the most common Payee of the last five with the Category, the newest on a tie", () => {
    const viaApp = { payeeId: "p-tfl" };
    const payeeOf = (transactions: MemoryTransaction[]) =>
      labelsForBankText(input("TFL TRAVEL CHARGE"), recallMemory(transactions))
        ?.suggestion.payeeId;
    expect(
      payeeOf([
        tfl("t1", viaApp),
        tfl("t2", viaApp),
        tfl("t3"),
        tfl("t4"),
        tfl("t5"),
        tfl("t6", viaApp),
        tfl("t7", viaApp),
      ]),
    ).toBeUndefined();
    expect(payeeOf([tfl("t1", viaApp), tfl("t2")])).toBe("p-tfl");
  });

  it("leaves the Category to the model when it changed between the last 20 rows", () => {
    expect(
      labelsForBankText(
        input("TFL TRAVEL CHARGE"),
        recallMemory([
          tfl("t1"),
          tfl("t2", { categoryId: "c-travel" }),
          tfl("t3"),
        ]),
      ),
    ).toMatchObject({
      suggestion: { categoryId: "c-commute", confidence: 0.7 },
      categoryAgrees: false,
    });
    const commutes = Array.from({ length: 20 }, (_, index) =>
      tfl(`t${String(index)}`),
    );
    expect(
      labelsForBankText(
        input("TFL TRAVEL CHARGE"),
        recallMemory([...commutes, tfl("old", { categoryId: "c-travel" })]),
      )?.categoryAgrees,
    ).toBe(true);
  });

  it("needs the same sign and a labelled expense or income", () => {
    const known = recallMemory([
      tfl("t1", { kind: "transfer" }),
      tfl("t2", { categoryId: null }),
      tfl("t3", { amountMinor: 300 }),
    ]);
    expect(labelsForBankText(input("TFL TRAVEL CHARGE"), known)).toBeNull();
    expect(
      labelsForBankText(input("TFL TRAVEL CHARGE", 300), known)?.suggestion,
    ).toEqual(expect.objectContaining({ categoryId: "c-commute" }));
    expect(labelsForBankText(input("UNKNOWN SHOP"), known)).toBeNull();
  });

  it("gives the account owner as the Member", () => {
    expect(
      labelsForBankText(
        input("TFL TRAVEL CHARGE", -280, "a-card"),
        recallMemory([tfl("t1")]),
      )?.suggestion.memberId,
    ).toBe("m-owner");
  });
});

describe("withBankTexts", () => {
  it("teaches the texts of rows about to match", () => {
    const taught = withBankTexts(memory, [
      { transactionId: "t5", text: "CORNER CAFE 12 LONDON" },
      { transactionId: "not-in-memory", text: "ELSEWHERE" },
    ]);
    expect(
      labelsForBankText(input("Corner Cafe 99"), taught)?.suggestion,
    ).toMatchObject({
      payeeId: "p-cafe",
      categoryId: "c-eating-out",
    });
    expect(labelsForBankText(input("Corner Cafe 99"), memory)).toBeNull();
  });
});

describe("suggestLabelsFromMemory", () => {
  it("prefers the labels of the same bank text over those of the alias's Payee", () => {
    const known = recallMemory([
      ...memory.transactions,
      transaction({
        id: "t7",
        categoryId: "c-household",
        bankTexts: ["LOCAL GROCER"],
      }),
    ]);
    expect(
      suggestLabelsFromMemory(input("LOCAL GROCER 77"), known)?.suggestion,
    ).toMatchObject({ categoryId: "c-household", source: "bank-text" });
  });

  it("falls back to the usual labels of the alias's Payee", () => {
    expect(
      suggestLabelsFromMemory(input("LOCAL GROCER 77"), memory),
    ).toMatchObject({
      suggestion: {
        payeeId: "p-grocer",
        categoryId: "c-groceries",
        tagIds: ["tag-a"],
        confidence: 0.95,
        source: "alias",
      },
      categoryAgrees: true,
    });
  });

  it("leaves a text it does not know to the model", () => {
    expect(suggestLabelsFromMemory(input("UBER"), memory)).toBeNull();
    expect(suggestLabelsFromMemory(input("GROCER LTD"), memory)).toBeNull();
  });

  it("labels only the fixture's known bank texts, and labels them right", () => {
    const fixture = buildFixtureMemory();
    const answered = categoriseFixture.cases.flatMap((testCase) => {
      const recalled = suggestLabelsFromMemory(
        {
          text: testCase.text,
          amountMinor: testCase.amountMinor,
          date: "2026-10-01",
          accountId: FIXTURE_ACCOUNT_ID,
        },
        fixture.memory,
      );
      return recalled ? [{ testCase, suggestion: recalled.suggestion }] : [];
    });

    expect(answered.map(({ testCase }) => testCase.text)).toEqual([
      "OCADO RETAIL LTD",
      "TFL TRAVEL CH",
    ]);
    for (const { testCase, suggestion } of answered) {
      expect(
        testCase.categories.map((key) => fixture.categoryId(key)),
      ).toContain(suggestion.categoryId);
    }
  });
});
