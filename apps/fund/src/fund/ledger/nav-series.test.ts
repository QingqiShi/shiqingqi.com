import { describe, expect, it } from "vitest";
import { navSeries } from "./nav-series.ts";
import { TEST_FIXTURES } from "./test-fixtures.ts";

const { fill, bar, instruments } = TEST_FIXTURES;

describe("navSeries", () => {
  it("rebases a daily rebalanced half-and-half benchmark to the NAV", () => {
    const points = navSeries({
      fills: [
        fill({
          symbol: "VOD.L",
          side: "buy",
          quantity: 1000,
          price: 1,
          filledOn: "2026-01-06",
        }),
      ],
      cashEntries: [{ date: "2026-01-02", kind: "deposit", amountGbp: 10_000 }],
      instruments: Object.values(instruments),
      bars: new Map([
        [
          "^FTSE",
          [
            bar("2026-01-05", 100),
            bar("2026-01-06", 110),
            bar("2026-01-07", 110),
          ],
        ],
        [
          "^GSPC",
          [
            bar("2026-01-05", 100),
            bar("2026-01-06", 100),
            bar("2026-01-07", 100),
          ],
        ],
        ["VOD.L", [bar("2026-01-06", 1), bar("2026-01-07", 1.1)]],
      ]),
      fx: [
        { date: "2026-01-05", gbpUsd: 1.25 },
        { date: "2026-01-07", gbpUsd: 1 },
      ],
      from: "2026-01-05",
      to: "2026-01-07",
    });

    expect(points).toEqual([
      {
        date: "2026-01-05",
        navGbp: 10_000,
        cashGbp: 10_000,
        benchmarkGbp: 10_000,
      },
      // The FTSE half gains 10%.
      {
        date: "2026-01-06",
        navGbp: 10_000,
        cashGbp: 9000,
        benchmarkGbp: 10_500,
      },
      // The S&P half gains 25% in pounds as the dollar rises.
      {
        date: "2026-01-07",
        navGbp: 10_100,
        cashGbp: 9000,
        benchmarkGbp: 11_812.5,
      },
    ]);
  });
});
