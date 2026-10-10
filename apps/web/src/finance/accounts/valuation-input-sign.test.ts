import { describe, expect, it } from "vitest";
import { parseMoney } from "../domain/money/parse-money.ts";
import {
  groupedDecimalText,
  valuationInputText,
} from "./valuation-input-sign.ts";

describe("valuationInputText", () => {
  it("shows an amount owed as a positive grouped amount", () => {
    expect(valuationInputText(-27_950_000, "loan", "GBP")).toBe("279,500.00");
    expect(valuationInputText(52_600_000, "property", "GBP")).toBe(
      "526,000.00",
    );
    expect(valuationInputText(0, "loan", "GBP")).toBe("0.00");
  });

  it("groups thousands in a way parseMoney reads back", () => {
    for (const minor of [5, -123_456, 1_234_567_890, 99_999]) {
      expect(parseMoney(groupedDecimalText(minor, "GBP"), "GBP")).toBe(minor);
    }
    expect(groupedDecimalText(-123_456, "GBP")).toBe("-1,234.56");
    expect(groupedDecimalText(1_234_567, "JPY")).toBe("1,234,567");
  });
});
