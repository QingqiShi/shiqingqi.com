import { describe, expect, it } from "vitest";
import { describeTransaction } from "./describe-transaction.ts";

const labels: Record<string, string> = {
  current: "Current",
  savings: "Savings",
};

function description(
  overrides: Partial<Parameters<typeof describeTransaction>[0]>,
) {
  return describeTransaction({
    transaction: { kind: "expense", note: "" },
    entries: [{ accountId: "current", amountMinor: -1_000 }],
    accountId: "current",
    payeeName: "Tesco",
    categoryLabel: undefined,
    kindLabel: "Expense",
    tagNames: [],
    accountLabel: (id) => labels[id] ?? id,
    ...overrides,
  });
}

const transfer = {
  transaction: { kind: "transfer" as const, note: "" },
  entries: [
    { accountId: "current", amountMinor: -5_000 },
    { accountId: "savings", amountMinor: 5_000 },
  ],
  payeeName: undefined,
  kindLabel: "Transfer",
};

describe("describeTransaction", () => {
  it("names the other account of a transfer in a Ledger, with the way the money went", () => {
    expect(description({ ...transfer, accountId: "current" })).toEqual({
      title: "Transfer",
      subtitle: "→ Savings",
      meta: "",
    });
    expect(description({ ...transfer, accountId: "savings" }).subtitle).toBe(
      "← Current",
    );
  });

  it("names both accounts of a transfer in a list across accounts", () => {
    expect(description({ ...transfer, accountId: null }).subtitle).toBe(
      "Current → Savings",
    );
  });

  it("names the Category when the Payee is the title, then the note", () => {
    expect(
      description({
        categoryLabel: "Groceries",
        transaction: { kind: "expense", note: "weekly shop" },
      }).subtitle,
    ).toBe("Groceries · weekly shop");
  });

  it("takes the title from the Payee, then the Category, then the note, then the kind", () => {
    expect(
      description({ payeeName: undefined, categoryLabel: "Groceries" }).title,
    ).toBe("Groceries");
    expect(
      description({
        payeeName: undefined,
        transaction: { kind: "expense", note: "Parking" },
      }).title,
    ).toBe("Parking");
    expect(description({ payeeName: undefined }).title).toBe("Expense");
  });

  it("leaves out what the title already says", () => {
    expect(
      description({ payeeName: undefined, categoryLabel: "Groceries" })
        .subtitle,
    ).toBe("");
    expect(
      description({
        payeeName: undefined,
        transaction: { kind: "expense", note: "Parking" },
      }).subtitle,
    ).toBe("");
  });

  it("names the account and the Tags in a list across accounts", () => {
    expect(
      description({ accountId: null, tagNames: ["dance", "kids"] }).meta,
    ).toBe("Current  #dance  #kids");
  });

  it("leaves the account out of a Ledger, which already names it", () => {
    expect(description({ tagNames: ["dance"] }).meta).toBe("#dance");
  });
});
