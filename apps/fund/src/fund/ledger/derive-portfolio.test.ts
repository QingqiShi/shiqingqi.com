import { describe, expect, it } from "vitest";
import { derivePortfolio } from "./derive-portfolio.ts";
import { TEST_FIXTURES } from "./test-fixtures.ts";
import { valuePortfolio } from "./value-portfolio.ts";

const { fill, bar, instruments } = TEST_FIXTURES;
const deposit = {
  date: "2026-01-02",
  kind: "deposit",
  amountGbp: 20_000,
} as const;

describe("derivePortfolio", () => {
  it("sells the oldest lots first, fees included in their cost", () => {
    const portfolio = derivePortfolio({
      fills: [
        fill({
          symbol: "VOD.L",
          side: "sell",
          quantity: 150,
          price: 1.5,
          filledOn: "2026-02-20",
        }),
        fill({
          symbol: "VOD.L",
          side: "buy",
          quantity: 100,
          price: 1.2,
          feesGbp: 0.6,
          filledOn: "2026-01-12",
        }),
        fill({
          symbol: "VOD.L",
          side: "buy",
          quantity: 100,
          price: 1,
          feesGbp: 0.5,
          filledOn: "2026-01-05",
        }),
      ],
      cashEntries: [deposit],
      asOf: "2026-02-20",
    });

    expect(portfolio.cashGbp).toBe(20_003.9);
    // 225 of proceeds less 100 × 1.005 and 50 × 1.206 of cost.
    expect(portfolio.realisedPnlGbp).toBe(64.2);
    expect(portfolio.positions).toEqual([
      expect.objectContaining({
        symbol: "VOD.L",
        quantity: 50,
        costGbp: 60.3,
        lots: [expect.objectContaining({ openedOn: "2026-01-12" })],
      }),
    ]);
  });

  it("locks a lot for 29 days and frees it on day 30", () => {
    const fills = [
      fill({
        symbol: "BP.L",
        side: "buy",
        quantity: 10,
        price: 4,
        filledOn: "2026-03-02",
      }),
    ];
    const on = (asOf: string) =>
      derivePortfolio({ fills, cashEntries: [deposit], asOf }).positions;

    expect(on("2026-03-01")).toEqual([]);
    expect(on("2026-03-31")[0]).toMatchObject({
      quantity: 10,
      unlockedQuantity: 0,
      lots: [{ unlockOn: "2026-04-01" }],
    });
    expect(on("2026-04-01")[0]?.unlockedQuantity).toBe(10);
  });

  it("converts each USD fill at its own rate", () => {
    const buy = fill({
      symbol: "AAPL",
      side: "buy",
      quantity: 10,
      price: 200,
      gbpUsd: 1.25,
      feesGbp: 2.4,
      filledOn: "2026-01-05",
    });
    const held = derivePortfolio({
      fills: [buy],
      cashEntries: [deposit],
      asOf: "2026-01-05",
    });
    const valued = valuePortfolio(held, {
      instruments: Object.values(instruments),
      bars: new Map([["AAPL", [bar("2026-01-05", 210)]]]),
      gbpUsd: 1.3,
    });
    expect(valued.positions[0]).toMatchObject({
      marketValueGbp: 1615.38,
      unrealisedPnlGbp: 12.98,
    });
    expect(valued.navGbp).toBe(20_012.98);

    // A 10% gain in dollars is a small loss in pounds once the dollar falls.
    const sold = derivePortfolio({
      fills: [
        buy,
        fill({
          symbol: "AAPL",
          side: "sell",
          quantity: 10,
          price: 220,
          gbpUsd: 1.375,
          feesGbp: 2.4,
          filledOn: "2026-03-02",
        }),
      ],
      cashEntries: [deposit],
      asOf: "2026-03-02",
    });
    expect(sold.realisedPnlGbp).toBe(-4.8);
    expect(sold.cashGbp).toBe(19_995.2);
    expect(sold.positions).toEqual([]);
  });
});
