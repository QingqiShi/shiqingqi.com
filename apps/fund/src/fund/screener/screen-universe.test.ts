import { describe, expect, it } from "vitest";
import type { Fundamentals } from "../contracts/fundamentals-schema.ts";
import type { Bar, Instrument } from "../types.ts";
import { screenUniverse } from "./screen-universe.ts";

function sessionDates(count: number): string[] {
  const dates: string[] = [];
  const day = new Date(Date.UTC(2024, 0, 1));
  while (dates.length < count) {
    if (day.getUTCDay() !== 0 && day.getUTCDay() !== 6) {
      dates.push(day.toISOString().slice(0, 10));
    }
    day.setUTCDate(day.getUTCDate() + 1);
  }
  return dates;
}

function flatBars(volume = 100_000, price = 100): Bar[] {
  return sessionDates(260).map((date) => ({
    date,
    open: price,
    high: price,
    low: price,
    close: price,
    adjClose: price,
    volume,
  }));
}

function stock(
  symbol: string,
  sector: string,
  currency: "GBP" | "USD" = "GBP",
): Instrument {
  return {
    symbol,
    kind: "stock",
    name: symbol,
    exchange: currency === "GBP" ? "LSE" : "US",
    currency,
    quoteScale: currency === "GBP" ? 100 : 1,
    sector,
    industry: null,
    index: currency === "GBP" ? "FTSE100" : "SP100",
    active: true,
  };
}

function fundamentalsWith(values: Partial<Fundamentals>): Fundamentals {
  return {
    financialCurrency: "GBP",
    marketCapGbp: 10_000_000_000,
    trailingEps: null,
    forwardEps: null,
    trailingPe: null,
    forwardPe: null,
    pegRatio: null,
    priceToBook: null,
    evToEbitda: null,
    freeCashFlowYield: null,
    dividendYield: null,
    returnOnEquity: null,
    profitMargin: null,
    revenueGrowth: null,
    earningsGrowth: null,
    debtToEquity: null,
    nextEarningsDate: null,
    exDividendDate: null,
    analystTargetMean: null,
    analystRecommendation: null,
    quarterlyEps: [],
    annual: [],
    ...values,
  };
}

const EQUAL_WEIGHTS = {
  value: 1,
  quality: 1,
  momentum: 1,
  growth: 1,
  lowVolatility: 1,
};

describe("screenUniverse", () => {
  it("ranks a loss worst on value and scores a stock on the inputs it has", () => {
    const fundamentals = new Map<string, Fundamentals>([
      [
        "PROFIT",
        fundamentalsWith({
          trailingEps: 10,
          trailingPe: 10,
          forwardEps: 10,
          forwardPe: 10,
          freeCashFlowYield: 0.05,
        }),
      ],
      [
        "LOSS",
        fundamentalsWith({
          trailingEps: -1,
          forwardEps: -0.5,
          freeCashFlowYield: -0.01,
        }),
      ],
      [
        "NO_TRAILING",
        fundamentalsWith({
          forwardEps: 20,
          forwardPe: 5,
          freeCashFlowYield: 0.1,
        }),
      ],
      ["NO_VALUE_DATA", fundamentalsWith({})],
    ]);
    const symbols = [...fundamentals.keys()];
    const result = screenUniverse({
      instruments: symbols.map((symbol) => stock(symbol, "Industrials")),
      bars: new Map(symbols.map((symbol) => [symbol, flatBars()])),
      fundamentals,
      fx: [{ date: "2024-12-31", gbpUsd: 1.25 }],
      weights: EQUAL_WEIGHTS,
      held: new Set(),
      asOf: "2025-01-02",
    });
    const value = Object.fromEntries(
      result.rows.map((row) => [row.symbol, row.percentiles.value]),
    );

    expect(value.LOSS).toBe(0);
    expect(value.NO_TRAILING).toBe(100);
    expect(value.NO_VALUE_DATA).toBe(50);
    expect(value.PROFIT).toBeCloseTo(200 / 3);
  });

  it("converts USD traded value to GBP before the liquidity rule", () => {
    const result = screenUniverse({
      instruments: [stock("THIN", "Technology", "USD")],
      bars: new Map([["THIN", flatBars(12_000, 100)]]),
      fundamentals: new Map([["THIN", fundamentalsWith({})]]),
      fx: [{ date: "2024-12-31", gbpUsd: 1.25 }],
      weights: EQUAL_WEIGHTS,
      held: new Set(),
      asOf: "2025-01-02",
    });

    expect(result.rows).toEqual([]);
    expect(result.excluded).toMatchObject([
      { symbol: "THIN", reason: "liquidity", measured: 960_000 },
    ]);
  });

  it("shortlists the best stocks the fund does not hold, at most two per sector", () => {
    const returnOnEquity = new Map([
      ["TECH1", 0.5],
      ["TECH2", 0.4],
      ["TECH3", 0.3],
      ["TECH4", 0.2],
      ["HEALTH1", 0.1],
    ]);
    const symbols = [...returnOnEquity.keys()];
    const result = screenUniverse({
      instruments: symbols.map((symbol) =>
        stock(symbol, symbol.startsWith("TECH") ? "Technology" : "Healthcare"),
      ),
      bars: new Map(symbols.map((symbol) => [symbol, flatBars()])),
      fundamentals: new Map(
        [...returnOnEquity].map(([symbol, roe]) => [
          symbol,
          fundamentalsWith({ returnOnEquity: roe }),
        ]),
      ),
      fx: [],
      weights: {
        value: 0,
        quality: 1,
        momentum: 0,
        growth: 0,
        lowVolatility: 0,
      },
      held: new Set(["TECH1"]),
      asOf: "2025-01-02",
    });

    expect(result.rows.map((row) => row.symbol)).toEqual(symbols);
    expect(result.shortlist.map((row) => row.symbol)).toEqual([
      "TECH2",
      "TECH3",
      "HEALTH1",
    ]);
  });
});
