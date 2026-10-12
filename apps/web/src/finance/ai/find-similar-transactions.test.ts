import { describe, expect, it } from "vitest";
import { findSimilarTransactions } from "./find-similar-transactions.ts";
import type { MemoryTransaction } from "./types.ts";

function transaction(
  overrides: Partial<MemoryTransaction> & { id: string },
): MemoryTransaction {
  return {
    date: "2026-09-01",
    kind: "expense",
    amountMinor: -1000,
    payeeId: null,
    categoryId: "c-other",
    memberId: null,
    tagIds: [],
    accountIds: ["a-other"],
    bankTexts: [],
    ...overrides,
  };
}

const input = {
  text: "TFL TRAVEL CHARGE 0042",
  amountMinor: -280,
  date: "2026-10-01",
  accountId: "a-card",
};

describe("findSimilarTransactions", () => {
  it("finds past Transactions by an alike bank text or Payee name, also without a Payee", () => {
    const memory = {
      payees: [{ id: "p-tfl", name: "TfL", defaultCategoryId: null }],
      transactions: [
        transaction({ id: "unrelated", bankTexts: ["TESCO STORES"] }),
        transaction({ id: "by-text", bankTexts: ["TFL TRAVEL CHARGE"] }),
        transaction({ id: "by-payee", payeeId: "p-tfl" }),
        transaction({
          id: "transfer",
          kind: "transfer",
          categoryId: null,
          bankTexts: ["TFL TRAVEL CHARGE"],
        }),
      ],
    };

    expect(
      findSimilarTransactions([input], memory).map(({ id }) => id),
    ).toEqual(["by-text", "by-payee"]);
  });

  it("takes the three most alike for each input, then one on the account with a near amount", () => {
    const memory = {
      payees: [],
      transactions: [
        transaction({
          id: "near-amount",
          amountMinor: -300,
          accountIds: ["a-card"],
        }),
        ...["t1", "t2", "t3", "t4"].map((id) =>
          transaction({ id, bankTexts: ["TFL TRAVEL"] }),
        ),
      ],
    };

    expect(
      findSimilarTransactions([input], memory).map(({ id }) => id),
    ).toEqual(["t1", "t2", "t3", "near-amount"]);
  });

  it("first takes the five newest rows with the same bank text of each Category", () => {
    const fare = (id: string, categoryId: string) =>
      transaction({ id, categoryId, bankTexts: ["TFL TRAVEL CHARGE"] });
    const memory = {
      payees: [],
      transactions: [
        ...["c1", "c2", "c3", "c4", "c5", "c6"].map((id) =>
          fare(id, "c-commute"),
        ),
        fare("w1", "c-travel"),
        fare("w2", "c-travel"),
      ],
    };

    expect(
      findSimilarTransactions([input], memory).map(({ id }) => id),
    ).toEqual(["c1", "c2", "c3", "c4", "c5", "w1", "w2"]);
  });
});
