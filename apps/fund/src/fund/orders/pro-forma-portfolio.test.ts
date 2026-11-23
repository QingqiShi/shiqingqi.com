import { describe, expect, it } from "vitest";
import { proFormaPortfolio } from "./pro-forma-portfolio.ts";
import {
  GBP_USD,
  INSTRUMENTS,
  testAction as action,
  testPlan as plan,
  testPortfolio,
} from "./test-plan.ts";

describe("proFormaPortfolio", () => {
  it("fills each planned order at its limit on the day it is placed", () => {
    const { planned } = plan([
      action({
        symbol: "AAPL",
        action: "buy",
        targetWeightPct: 10,
        limitPrice: 198,
      }),
      action({
        symbol: "VOD.L",
        action: "buy",
        targetWeightPct: 10,
        limitPrice: 71,
      }),
    ]);

    const after = proFormaPortfolio(testPortfolio(), planned, {
      instruments: INSTRUMENTS,
      gbpUsd: GBP_USD,
    });

    // £16,600 less £1,903.65 for AAPL and £591.53 for VOD.L.
    expect(after.cashGbp).toBe(14_104.82);
    // AAPL at its limit, VOD.L at its last close of 72p, BP.L unchanged.
    expect(after.navGbp).toBe(20_092.5);
    expect(after.positions.find((p) => p.symbol === "AAPL")).toMatchObject({
      quantity: 12,
      price: 198,
      unlockedQuantity: 0,
      lots: [{ openedOn: "2026-11-23", unlockOn: "2026-12-23" }],
    });
    expect(after.positions.find((p) => p.symbol === "VOD.L")?.quantity).toBe(
      2829,
    );
  });
});
