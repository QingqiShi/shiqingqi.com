import { describe, expect, it } from "vitest";
import { ledgerEntrySubtitle } from "./ledger-entry-subtitle.ts";

const labels: Record<string, string> = {
  current: "Current",
  savings: "Savings",
};

function subtitle(
  overrides: Partial<Parameters<typeof ledgerEntrySubtitle>[0]>,
) {
  return ledgerEntrySubtitle({
    transaction: { kind: "expense", note: "" },
    entries: [{ accountId: "current", amountMinor: -1_000 }],
    accountId: "current",
    title: "Tesco",
    categoryLabel: undefined,
    accountLabel: (id) => labels[id] ?? id,
    ...overrides,
  });
}

describe("ledgerEntrySubtitle", () => {
  it("names the other account of a transfer, with the way the money went", () => {
    const entries = [
      { accountId: "current", amountMinor: -5_000 },
      { accountId: "savings", amountMinor: 5_000 },
    ];
    const transaction = { kind: "transfer" as const, note: "" };
    expect(
      subtitle({
        transaction,
        entries,
        accountId: "current",
        title: "Transfer",
      }),
    ).toBe("→ Savings");
    expect(
      subtitle({
        transaction,
        entries,
        accountId: "savings",
        title: "Transfer",
      }),
    ).toBe("← Current");
  });

  it("names the Category when the Payee is the title, then the note", () => {
    expect(
      subtitle({
        categoryLabel: "Groceries",
        transaction: { kind: "expense", note: "weekly shop" },
      }),
    ).toBe("Groceries · weekly shop");
  });

  it("leaves out what the title already says", () => {
    expect(subtitle({ title: "Groceries", categoryLabel: "Groceries" })).toBe(
      "",
    );
    expect(
      subtitle({
        title: "Parking",
        transaction: { kind: "expense", note: "Parking" },
      }),
    ).toBe("");
  });
});
