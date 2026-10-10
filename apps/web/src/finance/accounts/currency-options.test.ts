import { describe, expect, it } from "vitest";
import { currencyOptions } from "./currency-options.ts";

describe("currencyOptions", () => {
  it("puts the base currency first, then the used ones, then common ones", () => {
    const options = currencyOptions("GBP", ["USD", "CNY", "GBP"]);
    expect(options.slice(0, 3)).toEqual(["GBP", "CNY", "USD"]);
    expect(options).toContain("EUR");
    expect(new Set(options).size).toBe(options.length);
  });

  it("keeps an unusual current currency", () => {
    expect(currencyOptions("GBP", [], "NZD")).toContain("NZD");
  });
});
