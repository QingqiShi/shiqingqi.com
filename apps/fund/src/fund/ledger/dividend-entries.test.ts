import { describe, expect, it } from "vitest";
import { dividendEntries } from "./dividend-entries.ts";
import { TEST_FIXTURES } from "./test-fixtures.ts";

const { fill, instruments } = TEST_FIXTURES;

describe("dividendEntries", () => {
  it("pays only the shares held at the close before the ex-date", () => {
    const entries = dividendEntries({
      fills: [
        fill({
          symbol: "VOD.L",
          side: "buy",
          quantity: 1000,
          price: 0.7,
          filledOn: "2026-06-01",
        }),
        fill({
          symbol: "VOD.L",
          side: "buy",
          quantity: 500,
          price: 0.7,
          filledOn: "2026-06-11",
        }),
        fill({
          symbol: "AAPL",
          side: "buy",
          quantity: 10,
          price: 200,
          gbpUsd: 1.3,
          filledOn: "2026-06-01",
        }),
      ],
      dividends: [
        { symbol: "VOD.L", exDate: "2026-06-11", amount: 0.02 },
        { symbol: "AAPL", exDate: "2026-06-12", amount: 0.25 },
        { symbol: "AAPL", exDate: "2026-09-12", amount: 0.25 },
      ],
      instruments: Object.values(instruments),
      fx: [
        { date: "2026-06-10", gbpUsd: 1.3 },
        { date: "2026-06-12", gbpUsd: 1.25 },
      ],
      paidKeys: new Set(),
      asOf: "2026-06-15",
    });

    expect(entries).toEqual([
      expect.objectContaining({
        date: "2026-06-11",
        kind: "dividend",
        amountGbp: 20,
        symbol: "VOD.L",
        dedupeKey: "VOD.L:2026-06-11",
      }),
      expect.objectContaining({ amountGbp: 2, dedupeKey: "AAPL:2026-06-12" }),
    ]);
  });

  it("skips a dividend already paid and one bought only on its ex-date", () => {
    const entries = dividendEntries({
      fills: [
        fill({
          symbol: "BP.L",
          side: "buy",
          quantity: 100,
          price: 4,
          filledOn: "2026-05-01",
        }),
        fill({
          symbol: "VOD.L",
          side: "buy",
          quantity: 100,
          price: 0.7,
          filledOn: "2026-06-11",
        }),
      ],
      dividends: [
        { symbol: "BP.L", exDate: "2026-06-11", amount: 0.06 },
        { symbol: "VOD.L", exDate: "2026-06-11", amount: 0.02 },
      ],
      instruments: Object.values(instruments),
      fx: [],
      paidKeys: new Set(["BP.L:2026-06-11"]),
      asOf: "2026-06-15",
    });

    expect(entries).toEqual([]);
  });
});
