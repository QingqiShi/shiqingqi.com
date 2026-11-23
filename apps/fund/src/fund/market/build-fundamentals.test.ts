import { describe, expect, it } from "vitest";
import { buildFundamentals } from "./build-fundamentals.ts";
import mksFundamentals from "./fixtures/mks-fundamentals.json";
import shelFundamentals from "./fixtures/shel-fundamentals.json";
import vodFundamentals from "./fixtures/vod-fundamentals.json";
import type { RawFundamentals } from "./types.ts";

// Spot rates recorded with the fixtures, at 2026-11-23T12:34Z.
const GBP_USD = 1.3098264;
const GBP_EUR = 1.1942;
const TODAY = "2026-11-23";

describe("buildFundamentals", () => {
  it("prices a pence-quoted stock against EPS reported in dollars", () => {
    const raw: RawFundamentals = shelFundamentals;
    const fundamentals = buildFundamentals(raw, {
      quoteScale: 100,
      today: TODAY,
      rates: { toFinancial: GBP_USD, toGbp: 1 },
    });
    // 3577p is £35.77, or $46.85; trailing diluted EPS is $5.76.
    expect(fundamentals.trailingEps).toBe(5.76);
    expect(fundamentals.trailingPe).toBeCloseTo((35.77 * GBP_USD) / 5.76, 6);
    expect(fundamentals.marketCapGbp).toBeCloseTo(201_927_639_040, -3);
  });

  it("gives no trailing PE for a company with a loss", () => {
    const raw: RawFundamentals = vodFundamentals;
    const fundamentals = buildFundamentals(raw, {
      quoteScale: 100,
      today: TODAY,
      rates: { toFinancial: GBP_EUR, toGbp: 1 },
    });
    expect(fundamentals.trailingEps).toBeLessThan(0);
    expect(fundamentals.trailingPe).toBeNull();
  });

  it("does not trust an EPS that its own net income and shares contradict", () => {
    // Yahoo gave M&S trailing EPS as 12.423 for 2026-09-30, beside net
    // income of £519m on 2,113.7m shares: £0.2455 a share.
    const raw: RawFundamentals = mksFundamentals;
    const fundamentals = buildFundamentals(raw, {
      quoteScale: 100,
      today: TODAY,
      rates: { toFinancial: 1, toGbp: 1 },
    });
    expect(fundamentals.trailingEps).toBeCloseTo(
      519_000_000 / 2_113_700_000,
      6,
    );
    expect(fundamentals.trailingPe).toBeCloseTo(4.526 / (519 / 2113.7), 6);
  });
});
