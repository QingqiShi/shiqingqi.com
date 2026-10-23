import { describe, expect, it } from "vitest";
import { latestFxRates } from "./latest-fx-rates.ts";

describe("latestFxRates", () => {
  it("takes the newest rate in either orientation, as base units per unit, with its source", () => {
    const rates = latestFxRates(
      [
        {
          base: "USD",
          quote: "GBP",
          on: "2026-01-01",
          rate: 0.8,
          source: "household",
        },
        {
          base: "GBP",
          quote: "USD",
          on: "2026-03-01",
          rate: 1.25,
          source: "ecb",
        },
        {
          base: "CNY",
          quote: "GBP",
          on: "2026-02-01",
          rate: 0.11,
          source: "household",
        },
        {
          base: "EUR",
          quote: "USD",
          on: "2026-04-01",
          rate: 1.1,
          source: "ecb",
        },
      ],
      ["CNY", "EUR", "USD"],
      "GBP",
    );
    expect(rates).toEqual([
      { currency: "CNY", rate: 0.11, on: "2026-02-01", source: "household" },
      { currency: "EUR", rate: null, on: null, source: null },
      { currency: "USD", rate: 0.8, on: "2026-03-01", source: "ecb" },
    ]);
  });

  it("prefers the row quoted in the base currency when both orientations share a day", () => {
    const [usd] = latestFxRates(
      [
        {
          base: "GBP",
          quote: "USD",
          on: "2026-03-01",
          rate: 1.2,
          source: "ecb",
        },
        {
          base: "USD",
          quote: "GBP",
          on: "2026-03-01",
          rate: 0.79,
          source: "household",
        },
      ],
      ["USD"],
      "GBP",
    );
    expect(usd).toEqual({
      currency: "USD",
      rate: 0.79,
      on: "2026-03-01",
      source: "household",
    });
  });
});
