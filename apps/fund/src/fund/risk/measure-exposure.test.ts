import { describe, expect, it } from "vitest";
import type {
  Bar,
  Instrument,
  ScreenRow,
  ValuedPortfolio,
  ValuedPosition,
} from "../types.ts";
import { measureExposure } from "./measure-exposure.ts";

const AS_OF = "2025-03-03";

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

function barsFromReturns(returns: readonly number[]): Bar[] {
  const dates = sessionDates(returns.length + 1);
  let price = 100;
  return dates.map((date, index) => {
    if (index > 0) price *= 1 + returns[index - 1];
    return {
      date,
      open: price,
      high: price,
      low: price,
      close: price,
      adjClose: price,
      volume: 1_000_000,
    };
  });
}

function stock(symbol: string, currency: "GBP" | "USD" = "GBP"): Instrument {
  return {
    symbol,
    kind: "stock",
    name: symbol,
    exchange: currency === "GBP" ? "LSE" : "US",
    currency,
    quoteScale: currency === "GBP" ? 100 : 1,
    sector: "Technology",
    industry: null,
    index: currency === "GBP" ? "FTSE100" : "SP100",
    active: true,
  };
}

function portfolio(
  holdings: { symbol: string; weightPct: number; unlockOn?: string }[],
): ValuedPortfolio {
  const navGbp = 10_000;
  const positions = holdings.map(
    ({ symbol, weightPct, unlockOn = "2024-01-01" }): ValuedPosition => ({
      symbol,
      quantity: 10,
      unlockedQuantity: unlockOn > AS_OF ? 0 : 10,
      costGbp: (navGbp * weightPct) / 100,
      lots: [
        {
          fillId: `${symbol}-1`,
          openedOn: "2023-12-01",
          unlockOn,
          quantity: 10,
          costGbpPerShare: (navGbp * weightPct) / 1000,
        },
      ],
      price: 100,
      priceDate: "2025-02-28",
      marketValueGbp: (navGbp * weightPct) / 100,
      weightPct,
      unrealisedPnlGbp: 0,
    }),
  );
  const invested = holdings.reduce((sum, { weightPct }) => sum + weightPct, 0);
  return {
    asOf: AS_OF,
    cashGbp: (navGbp * (100 - invested)) / 100,
    realisedPnlGbp: 0,
    dividendsGbp: 0,
    navGbp,
    cashWeightPct: 100 - invested,
    gbpUsd: 1.25,
    positions,
  };
}

function screenRow(
  symbol: string,
  percentiles: ScreenRow["percentiles"],
): ScreenRow {
  return {
    symbol,
    sector: "Technology",
    composite: 50,
    percentiles,
    metrics: {
      lastClose: 100,
      return12m1mPct: null,
      return1mPct: null,
      vs200dmaPct: null,
      volatility1yPct: null,
      trailingPe: null,
      forwardPe: null,
      freeCashFlowYieldPct: null,
      returnOnEquityPct: null,
      profitMarginPct: null,
      revenueGrowthPct: null,
      earningsGrowthPct: null,
      marketCapGbp: null,
      nextEarningsDate: null,
    },
  };
}

const alternating = (size: number, count = 300) =>
  Array.from({ length: count }, (_, index) => (index % 2 === 0 ? size : -size));

describe("measureExposure", () => {
  it("measures an all-cash fund as riskless with no tilts", () => {
    const exposure = measureExposure({
      portfolio: portfolio([]),
      instruments: [],
      bars: new Map(),
      fx: [],
      screenRows: [],
      fundamentals: new Map(),
      asOf: AS_OF,
    });

    expect(exposure.metrics).toMatchObject({
      equity_beta: 0,
      annual_volatility_pct: 0,
      cash_weight_pct: 100,
      position_count: 0,
      locked_weight_pct: 0,
      value_tilt: null,
      low_volatility_tilt: null,
    });
  });

  it("measures beta 2 for a stock that moves twice as much as its index", () => {
    const indexReturns = Array.from(
      { length: 300 },
      (_, index) => 0.01 * Math.sin(index),
    );
    const exposure = measureExposure({
      portfolio: portfolio([{ symbol: "LEVER.L", weightPct: 50 }]),
      instruments: [stock("LEVER.L")],
      bars: new Map([
        ["LEVER.L", barsFromReturns(indexReturns.map((r) => 2 * r))],
        ["^FTSE", barsFromReturns(indexReturns)],
      ]),
      fx: [],
      screenRows: [],
      fundamentals: new Map(),
      asOf: AS_OF,
    });

    expect(exposure.positions[0].beta).toBeCloseTo(2, 10);
    expect(exposure.metrics.equity_beta).toBeCloseTo(1, 10);
  });

  it("measures the volatility of a GBP and a USD stock in GBP", () => {
    const exposure = measureExposure({
      portfolio: portfolio([
        { symbol: "GB.L", weightPct: 50 },
        { symbol: "US", weightPct: 25 },
      ]),
      instruments: [stock("GB.L"), stock("US", "USD")],
      bars: new Map([
        ["GB.L", barsFromReturns(alternating(0.01))],
        ["US", barsFromReturns(alternating(0.02))],
        ["^FTSE", barsFromReturns(alternating(0.005))],
        ["^GSPC", barsFromReturns(alternating(0.005))],
      ]),
      fx: [{ date: "2023-12-29", gbpUsd: 1.25 }],
      screenRows: [],
      fundamentals: new Map(),
      asOf: AS_OF,
    });

    // The portfolio moves +1% and -1% in turn over 252 returns, so its
    // sample variance is 0.0001 * 252 / 251 a day.
    expect(exposure.metrics.annual_volatility_pct).toBeCloseTo(15.9061, 3);
  });

  it("tilts by invested weight and flags earnings inside the lock", () => {
    const exposure = measureExposure({
      portfolio: portfolio([
        { symbol: "CHEAP.L", weightPct: 30, unlockOn: "2025-03-20" },
        { symbol: "FAIR.L", weightPct: 10 },
      ]),
      instruments: [stock("CHEAP.L"), stock("FAIR.L")],
      bars: new Map(),
      fx: [],
      screenRows: [
        screenRow("CHEAP.L", {
          value: 90,
          quality: 50,
          momentum: 50,
          growth: 50,
          lowVolatility: 20,
        }),
        screenRow("FAIR.L", {
          value: 50,
          quality: 50,
          momentum: 50,
          growth: 50,
          lowVolatility: 20,
        }),
      ],
      fundamentals: new Map([["CHEAP.L", { nextEarningsDate: "2025-03-12" }]]),
      asOf: AS_OF,
    });

    expect(exposure.metrics.value_tilt).toBeCloseTo(30);
    expect(exposure.metrics.low_volatility_tilt).toBeCloseTo(-30);
    expect(exposure.metrics.locked_weight_pct).toBeCloseTo(30);
    expect(exposure.unlockSchedule).toEqual([
      { date: "2025-03-20", valueGbp: 3000, symbols: ["CHEAP.L"] },
    ]);
    expect(exposure.earningsInLock).toEqual([
      {
        symbol: "CHEAP.L",
        nextEarningsDate: "2025-03-12",
        unlockOn: "2025-03-20",
      },
    ]);
  });
});
