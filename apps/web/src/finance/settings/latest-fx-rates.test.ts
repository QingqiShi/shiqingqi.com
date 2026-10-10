import { describe, expect, it } from "vitest";
import { latestFxRates, parseFxRate } from "./latest-fx-rates.ts";

describe("latestFxRates", () => {
  it("takes the newest rate in either orientation, as base units per unit", () => {
    const rates = latestFxRates(
      [
        { base: "USD", quote: "GBP", on: "2026-01-01", rate: 0.8 },
        { base: "GBP", quote: "USD", on: "2026-03-01", rate: 1.25 },
        { base: "CNY", quote: "GBP", on: "2026-02-01", rate: 0.11 },
        { base: "EUR", quote: "USD", on: "2026-04-01", rate: 1.1 },
      ],
      ["CNY", "EUR", "USD"],
      "GBP",
    );
    expect(rates).toEqual([
      { currency: "CNY", rate: 0.11, on: "2026-02-01" },
      { currency: "EUR", rate: null, on: null },
      { currency: "USD", rate: 0.8, on: "2026-03-01" },
    ]);
  });
});

describe("parseFxRate", () => {
  it("reads a positive number and refuses the rest", () => {
    expect(parseFxRate(" 0.79 ")).toBe(0.79);
    expect(parseFxRate("1,234.5")).toBe(1234.5);
    expect(parseFxRate("０.５")).toBe(0.5);
    expect(parseFxRate("0")).toBeNull();
    expect(parseFxRate("-1")).toBeNull();
    expect(parseFxRate("abc")).toBeNull();
  });
});
