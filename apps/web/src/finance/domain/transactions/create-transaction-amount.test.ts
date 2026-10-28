import { describe, expect, it } from "vitest";
import { createFxIndex } from "../balance/create-fx-index.ts";
import {
  countedEntries,
  createTransactionAmount,
  type AmountAccount,
} from "./create-transaction-amount.ts";

const accounts = new Map<string, AmountAccount>([
  ["card", { kind: "credit", currency: "GBP" }],
  ["bank", { kind: "cash", currency: "GBP" }],
  ["usd", { kind: "cash", currency: "USD" }],
  ["friend", { kind: "receivable", currency: "GBP" }],
  ["friendUsd", { kind: "receivable", currency: "USD" }],
  ["plan", { kind: "loan", currency: "GBP" }],
]);
const accountOf = (id: string) => accounts.get(id);

const fx = createFxIndex(
  [
    { base: "USD", quote: "GBP", on: "2026-01-01", rate: 0.8 },
    { base: "USD", quote: "GBP", on: "2026-03-01", rate: 0.75 },
  ],
  "GBP",
);
const amountOf = createTransactionAmount(fx, accountOf);

function entry(accountId: string, amountMinor: number, position: number) {
  return { accountId, amountMinor, position };
}

describe("createTransactionAmount", () => {
  it("counts the one Entry of a base-currency expense as it is", () => {
    expect(
      amountOf({ kind: "expense", date: "2026-02-01" }, [
        entry("card", -1250, 0),
      ]),
    ).toBe(-1250);
  });

  it("converts a foreign Entry at the rate on the Transaction's date", () => {
    const transaction = { kind: "expense", date: "2026-02-15" };
    expect(amountOf(transaction, [entry("usd", -1000, 0)])).toBe(-800);
    expect(
      amountOf({ ...transaction, date: "2026-03-02" }, [
        entry("usd", -1000, 0),
      ]),
    ).toBe(-750);
  });

  it("counts only the Household's part of a shared bill", () => {
    expect(
      amountOf({ kind: "expense", date: "2026-02-01" }, [
        entry("card", -49739, 0),
        entry("friend", 24870, 1),
      ]),
    ).toBe(-24869);
  });

  it("counts a repayment of money owed as no income", () => {
    expect(
      amountOf({ kind: "income", date: "2026-02-01" }, [
        entry("bank", 24870, 0),
        entry("friend", -24870, 1),
      ]),
    ).toBe(0);
  });

  it("converts each counted Entry in its own currency", () => {
    expect(
      amountOf({ kind: "expense", date: "2026-02-01" }, [
        entry("card", -2000, 0),
        entry("friendUsd", 1000, 1),
      ]),
    ).toBe(-1200);
  });

  it("counts a purchase paid down by a loan in full", () => {
    expect(
      amountOf({ kind: "expense", date: "2026-02-01" }, [
        entry("card", -90000, 0),
        entry("plan", 90000, 1),
      ]),
    ).toBe(-90000);
  });

  it("counts a refund as a positive expense", () => {
    expect(
      amountOf({ kind: "expense", date: "2026-02-01" }, [
        entry("card", 1599, 0),
      ]),
    ).toBe(1599);
  });

  it("counts a transfer as nothing", () => {
    expect(
      amountOf({ kind: "transfer", date: "2026-02-01" }, [
        entry("bank", -5000, 0),
        entry("card", 5000, 1),
      ]),
    ).toBe(0);
  });

  it("starts from the Entry with the lowest position, in any order", () => {
    expect(
      amountOf({ kind: "income", date: "2026-02-01" }, [
        entry("plan", -300, 1),
        entry("bank", 300, 0),
      ]),
    ).toBe(300);
  });
});

describe("countedEntries", () => {
  it("counts a main Entry on money owed once", () => {
    const main = entry("friend", 500, 0);
    expect(
      countedEntries({ kind: "income", date: "2026-02-01" }, [main], accountOf),
    ).toEqual([main]);
  });
});
