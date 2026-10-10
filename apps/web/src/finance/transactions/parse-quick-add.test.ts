import { describe, expect, it } from "vitest";
import { parseQuickAdd } from "./parse-quick-add.ts";

describe("parseQuickAdd", () => {
  it("reads the amount before or after the Payee", () => {
    expect(parseQuickAdd("12.5 ocado", "GBP")).toEqual({
      kind: "expense",
      kindIsExplicit: false,
      amountMinor: 1250,
      text: "ocado",
      toText: "",
      accountText: "",
    });
    expect(parseQuickAdd("ocado 12.5", "GBP")).toMatchObject({
      kind: "expense",
      amountMinor: 1250,
      text: "ocado",
    });
    expect(parseQuickAdd("  Pret A Manger   4.35 ", "GBP")).toMatchObject({
      amountMinor: 435,
      text: "Pret A Manger",
    });
  });

  it("keeps a number inside the Payee name", () => {
    expect(parseQuickAdd("3 Pret 2 Go", "GBP")).toMatchObject({
      amountMinor: 300,
      text: "Pret 2 Go",
    });
    expect(parseQuickAdd("Pret 2 Go 3", "GBP")).toMatchObject({
      amountMinor: 300,
      text: "Pret 2 Go",
    });
  });

  it("makes a leading plus an income and a minus an explicit expense", () => {
    expect(parseQuickAdd("+2000 salary", "GBP")).toMatchObject({
      kind: "income",
      kindIsExplicit: true,
      amountMinor: 200_000,
      text: "salary",
    });
    expect(parseQuickAdd("-£3.20 coffee", "GBP")).toMatchObject({
      kind: "expense",
      kindIsExplicit: true,
      amountMinor: 320,
    });
  });

  it("reads a transfer with and without a source account", () => {
    expect(parseQuickAdd("500 > isa", "GBP")).toEqual({
      kind: "transfer",
      kindIsExplicit: true,
      amountMinor: 50_000,
      text: "",
      toText: "isa",
      accountText: "",
    });
    expect(parseQuickAdd("1,250.50 current  >  stocks isa", "GBP")).toEqual({
      kind: "transfer",
      kindIsExplicit: true,
      amountMinor: 125_050,
      text: "current",
      toText: "stocks isa",
      accountText: "",
    });
  });

  it("reads an amount in the middle, with the account after it", () => {
    expect(parseQuickAdd("tesco 8 visa", "GBP")).toMatchObject({
      kind: "expense",
      amountMinor: 800,
      text: "tesco",
      accountText: "visa",
    });
    expect(parseQuickAdd("pret a manger 4.35 joint card", "GBP")).toMatchObject(
      {
        amountMinor: 435,
        text: "pret a manger",
        accountText: "joint card",
      },
    );
  });

  it("reads a Category name as the text", () => {
    expect(parseQuickAdd("12.50 超市", "GBP")).toMatchObject({
      amountMinor: 1250,
      text: "超市",
    });
    expect(parseQuickAdd("+2000 工资", "GBP")).toMatchObject({
      kind: "income",
      amountMinor: 200_000,
      text: "工资",
    });
  });

  it("keeps the text when there is no amount yet", () => {
    expect(parseQuickAdd("ocado", "GBP")).toMatchObject({
      amountMinor: null,
      text: "ocado",
    });
    expect(parseQuickAdd("12.345 ocado", "GBP")).toMatchObject({
      amountMinor: null,
      text: "12.345 ocado",
    });
    expect(parseQuickAdd("   ", "GBP")).toBeNull();
  });

  it("reads full-width digits and a Chinese Payee", () => {
    expect(parseQuickAdd("１２．５ 午饭", "CNY")).toMatchObject({
      amountMinor: 1250,
      text: "午饭",
    });
  });
});
