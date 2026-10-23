import { describe, expect, it } from "vitest";
import { accountInitials } from "./account-initials.ts";

describe("accountInitials", () => {
  it("takes the first letters of the first and last word", () => {
    expect(
      accountInitials(["Alex Current", "Rainy Day Savings", "monzo"]),
    ).toEqual(["AC", "RS", "M"]);
  });

  it("tells two names apart that would share their initials", () => {
    expect(
      accountInitials(["Alex Current", "Amex Card", "Alex Cash ISA"]),
    ).toEqual(["AC", "AA", "AI"]);
  });

  it("uses other letters of a one-word name", () => {
    expect(accountInitials(["Chase", "Citi"])).toEqual(["C", "CI"]);
  });

  it("keeps a character outside the Latin script whole", () => {
    expect(accountInitials(["招商银行", "招行储蓄"])).toEqual(["招", "招行"]);
  });

  it("numbers names it cannot tell apart", () => {
    expect(accountInitials(["Saver", "Saver", "Saver"])).toEqual([
      "S",
      "SA",
      "SV",
    ]);
    expect(accountInitials(["AB", "AB", "AB"])).toEqual(["A", "AB", "A2"]);
  });
});
