import { describe, expect, it } from "vitest";
import { SUPPORTED_CURRENCIES } from "../exchange-rates/supported-currencies.ts";
import { currencyOptions } from "./currency-options.ts";

describe("currencyOptions", () => {
  it("puts the base currency first, then the used ones, then common ones, then every other supported one", () => {
    const options = currencyOptions("GBP", ["USD", "CNY", "GBP"]);
    expect(options.slice(0, 4)).toEqual(["GBP", "CNY", "USD", "EUR"]);
    expect(new Set(options)).toEqual(new Set(SUPPORTED_CURRENCIES));
    expect(new Set(options).size).toBe(options.length);
  });

  it("offers no unsupported currency an account already uses", () => {
    expect(currencyOptions("GBP", ["AED"])).not.toContain("AED");
  });

  it("keeps each currency it is asked to keep, even an unsupported one", () => {
    const options = currencyOptions("GBP", [], ["AED", undefined, "TWD"]);
    expect(options).toContain("AED");
    expect(options).toContain("TWD");
  });
});
