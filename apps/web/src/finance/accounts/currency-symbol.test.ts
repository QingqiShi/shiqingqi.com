import { describe, expect, it } from "vitest";
import { currencySymbol } from "./currency-symbol.ts";

describe("currencySymbol", () => {
  it("gives the narrow mark of a currency", () => {
    expect(currencySymbol("GBP", "en")).toBe("£");
    expect(currencySymbol("USD", "en")).toBe("$");
    expect(currencySymbol("EUR", "zh")).toBe("€");
  });
});
