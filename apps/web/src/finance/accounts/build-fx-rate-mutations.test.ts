import { describe, expect, it } from "vitest";
import {
  buildFxRateMutations,
  fxRateText,
  parseFxRate,
} from "./build-fx-rate-mutations.ts";

describe("parseFxRate", () => {
  it("reads a positive rate with up to eight decimals", () => {
    expect(parseFxRate(" 0.79 ")).toBe(0.79);
    expect(parseFxRate("７.２")).toBe(7.2);
    expect(parseFxRate("0")).toBeNull();
    expect(parseFxRate("-1")).toBeNull();
    expect(parseFxRate("1,5")).toBeNull();
    expect(parseFxRate("0.123456789")).toBeNull();
  });
});

describe("buildFxRateMutations", () => {
  const fields = [
    { currency: "USD", current: 0.8 },
    { currency: "CNY", current: 0.1052631578 },
  ];

  it("writes a rate per changed field, foreign to base", () => {
    expect(fxRateText(0.1052631578)).toBe("0.105263");
    const result = buildFxRateMutations(
      fields,
      new Map([
        ["USD", "0.79"],
        ["CNY", "0.105263"],
      ]),
      "GBP",
      "2026-10-10",
    );
    expect(result).toEqual({
      rates: [{ base: "USD", quote: "GBP", on: "2026-10-10", rate: 0.79 }],
      invalid: [],
    });
  });

  it("reports a field that is not a rate", () => {
    expect(
      buildFxRateMutations(
        fields,
        new Map([["USD", "abc"]]),
        "GBP",
        "2026-10-10",
      ).invalid,
    ).toEqual(["USD"]);
  });
});
