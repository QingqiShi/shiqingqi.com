import { describe, expect, it } from "vitest";
import {
  buildFixtureMemory,
  FIXTURE_ACCOUNT_ID,
} from "./eval/build-fixture-memory.ts";
import { categoriseFixture } from "./eval/categorise-fixture.ts";
import { labelsForPayee } from "./labels-for-payee.ts";
import { matchPayee } from "./match-payee.ts";
import { normaliseBankText } from "./normalise-bank-text.ts";
import { scoreTextSimilarity } from "./score-text-similarity.ts";
import { suggestLabelsFromMemory } from "./suggest-labels-from-memory.ts";
import type { LabelMemory, MemoryTransaction } from "./types.ts";

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
    transaction({ id: "t6" }),
    transaction({ id: "t5", payeeId: "p-cafe", categoryId: "c-eating-out" }),
  ],
};

describe("matchPayee", () => {
  it("finds an alias first", () => {
    expect(matchPayee("LOCAL GROCER 77 LONDON", memory)).toEqual({
      payeeId: "p-grocer",
      source: "alias",
      score: 1,
    });
  });

  it("ignores an alias of a Payee that is gone", () => {
    expect(matchPayee("OLD SHOP", memory)).toBeNull();
  });

  it("falls back to the most alike name", () => {
    expect(matchPayee("CORNER CAFE 12", memory)).toMatchObject({
      payeeId: "p-cafe",
      source: "history",
      score: 1,
    });
    expect(matchPayee("SOMEWHERE ELSE", memory)).toBeNull();
  });
});

describe("labelsForPayee", () => {
  it("takes the mode, the frequent tags and the most common member", () => {
    expect(labelsForPayee("p-grocer", "a-current", memory)).toEqual({
      categoryId: "c-groceries",
      tagIds: ["tag-a"],
      memberId: "m-2",
      confidence: 0.95,
    });
  });

  it("prefers the default category and the account owner", () => {
    expect(labelsForPayee("p-cafe", "a-card", memory)).toEqual({
      categoryId: "c-coffee",
      tagIds: [],
      memberId: "m-owner",
      confidence: 0.7,
    });
  });
});

describe("suggestLabelsFromMemory", () => {
  it("scales the confidence by the history score", () => {
    const suggestion = suggestLabelsFromMemory(
      {
        text: "GROCER LTD",
        amountMinor: -500,
        date: "2026-10-01",
        accountId: "a-current",
      },
      memory,
    );
    expect(suggestion).toMatchObject({
      payeeId: "p-grocer",
      categoryId: "c-groceries",
      source: "history",
    });
    expect(suggestion?.confidence).toBeCloseTo(0.95 * 0.7);
  });

  it("labels the fixture's known merchants correctly and leaves the rest to the model", () => {
    const fixture = buildFixtureMemory();
    const answered = categoriseFixture.cases.flatMap((testCase) => {
      const suggestion = suggestLabelsFromMemory(
        {
          text: testCase.text,
          amountMinor: testCase.amountMinor,
          date: "2026-10-01",
          accountId: FIXTURE_ACCOUNT_ID,
        },
        fixture.memory,
      );
      return suggestion ? [{ testCase, suggestion }] : [];
    });
    const correct = answered.filter(({ testCase, suggestion }) =>
      testCase.categories
        .map((key) => fixture.categoryId(key))
        .includes(suggestion.categoryId),
    );

    expect(answered.length).toBeGreaterThanOrEqual(10);
    expect(correct.length / answered.length).toBeGreaterThanOrEqual(0.9);
  });
});
