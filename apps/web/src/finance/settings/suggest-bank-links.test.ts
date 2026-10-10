import { describe, expect, it } from "vitest";
import {
  nameSimilarity,
  suggestBankLinks,
  type SuggestFinanceAccount,
  type SuggestProviderAccount,
} from "./suggest-bank-links.ts";

function provider(
  id: string,
  name: string,
  institution = "",
  currency: string | null = "GBP",
  linkedTo: string | null = null,
): SuggestProviderAccount {
  return {
    providerAccountId: id,
    name,
    institution,
    currency,
    link: linkedTo === null ? null : { accountId: linkedTo },
  };
}

function account(
  id: string,
  name: string,
  institution = "",
  overrides: Partial<SuggestFinanceAccount> = {},
): SuggestFinanceAccount {
  return {
    id,
    name,
    institution,
    currency: "GBP",
    kind: "cash",
    closedOn: null,
    ...overrides,
  };
}

describe("nameSimilarity", () => {
  it("ignores case, punctuation and word order", () => {
    expect(nameSimilarity("Alex Visa", "visa - ALEX")).toBe(1);
    expect(nameSimilarity("Tesco", "Ocado")).toBeLessThan(0.3);
  });
});

describe("suggestBankLinks", () => {
  it("picks the account with the same name", () => {
    const suggestions = suggestBankLinks(
      [provider("p1", "Alex Visa"), provider("p2", "Sam Current")],
      [
        account("a1", "Sam Current"),
        account("a2", "Alex Visa", "", { kind: "credit" }),
      ],
    );
    expect(Object.fromEntries(suggestions)).toEqual({ p1: "a2", p2: "a1" });
  });

  it("uses the institution to choose between alike names", () => {
    const suggestions = suggestBankLinks(
      [provider("p1", "Current Account", "Harbour Bank")],
      [
        account("a1", "Current", "Northbank"),
        account("a2", "Current", "Harbour Bank"),
      ],
    );
    expect(suggestions.get("p1")).toBe("a2");
  });

  it("needs the same currency, a linkable open account, and one that is free", () => {
    const suggestions = suggestBankLinks(
      [
        provider("usd", "Dollar Account", "", "USD"),
        provider("closed", "Old Current"),
        provider("pension", "Pension"),
        provider("taken", "Alex Visa"),
        provider("holder", "Card", "", "GBP", "visa"),
      ],
      [
        account("us", "Dollar Account"),
        account("old", "Old Current", "", { closedOn: "2025-01-01" }),
        account("pen", "Pension", "", { kind: "investment" }),
        account("visa", "Alex Visa", "", { kind: "credit" }),
      ],
    );
    expect(suggestions.size).toBe(0);
  });

  it("suggests each account once, to the closest name", () => {
    const suggestions = suggestBankLinks(
      [provider("p1", "Joint Saver"), provider("p2", "Joint Savings")],
      [account("a1", "Joint Savings")],
    );
    expect(Object.fromEntries(suggestions)).toEqual({ p2: "a1" });
  });

  it("suggests nothing for a name unlike every account", () => {
    expect(
      suggestBankLinks(
        [provider("p1", "Rewards")],
        [account("a1", "Holiday Fund")],
      ).size,
    ).toBe(0);
  });
});
