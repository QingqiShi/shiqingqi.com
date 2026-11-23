import { describe, expect, it } from "vitest";
import { TEST_FIXTURES } from "../ledger/test-fixtures.ts";
import { fillHint } from "./fill-hint.ts";

const { bar } = TEST_FIXTURES;

describe("fillHint", () => {
  const bars = new Map([
    [
      "VOD.L",
      [
        bar("2026-11-20", 0.7, { low: 0.6 }),
        bar("2026-11-23", 1.05, { open: 1.04, low: 1.02, high: 1.06 }),
        bar("2026-11-24", 0.98, { open: 0.97, low: 0.95, high: 0.99 }),
        bar("2026-11-25", 1.01, { open: 1.03, low: 0.99, high: 1.04 }),
      ],
    ],
  ]);
  const order = {
    symbol: "VOD.L",
    limitPrice: 1,
    placedFor: "2026-11-23",
    validUntil: "2026-11-25",
  };

  it("fills a buy that opens below its limit at the open", () => {
    expect(fillHint({ ...order, side: "buy" }, bars)).toEqual([
      { date: "2026-11-23", reachable: false, extreme: 1.02, price: null },
      { date: "2026-11-24", reachable: true, extreme: 0.95, price: 0.97 },
      { date: "2026-11-25", reachable: true, extreme: 0.99, price: 1 },
    ]);
  });

  it("fills a sell that opens above its limit at the open", () => {
    expect(fillHint({ ...order, side: "sell" }, bars)).toEqual([
      { date: "2026-11-23", reachable: true, extreme: 1.06, price: 1.04 },
      { date: "2026-11-24", reachable: false, extreme: 0.99, price: null },
      { date: "2026-11-25", reachable: true, extreme: 1.04, price: 1.03 },
    ]);
  });
});
