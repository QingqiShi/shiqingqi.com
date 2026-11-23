import { describe, expect, it } from "vitest";
import { TEST_FIXTURES } from "../ledger/test-fixtures.ts";
import {
  BARS,
  testAction as action,
  testOrder as openOrder,
  testPlan as plan,
  testPortfolio,
} from "./test-plan.ts";

const { fill } = TEST_FIXTURES;
const codes = (result: ReturnType<typeof plan>) =>
  result.violations.map((v) => [v.symbol, v.code]);

// The test fund: £16,600 of cash, 2,000 VOD.L at 72p and 500 BP.L at 410p,
// so a NAV of £20,090. GBPUSD is 1.25.
describe("planOrders", () => {
  it("sizes buys to the target weight at the limit, fees included", () => {
    const result = plan([
      action({
        symbol: "AAPL",
        action: "buy",
        targetWeightPct: 10,
        limitPrice: 198,
        onExpiry: "reprice",
        repriceLimit: 202,
      }),
      action({
        symbol: "VOD.L",
        action: "buy",
        targetWeightPct: 10,
        limitPrice: 71,
      }),
    ]);

    expect(result.violations).toEqual([]);
    expect(result.planned).toEqual([
      expect.objectContaining({
        symbol: "AAPL",
        side: "buy",
        // £2,009 at $198 / 1.25 = £158.40 a share.
        quantity: 12,
        limitPrice: 198,
        repriceLimit: 202,
        placedFor: "2026-11-23",
        validUntil: "2026-11-25",
        estimatedValueGbp: 1900.8,
        estimatedFeesGbp: 2.85,
      }),
      expect.objectContaining({
        symbol: "VOD.L",
        // 2,829 shares make 10%, and the fund holds 2,000.
        quantity: 829,
        limitPrice: 0.71,
        estimatedValueGbp: 588.59,
        estimatedFeesGbp: 2.94,
      }),
    ]);
    expect(result.planned[0]?.weightAfterPct).toBeCloseTo(9.46, 2);
  });

  it("catches a limit far from the last close, such as pounds for pence", () => {
    const result = plan([
      action({
        symbol: "VOD.L",
        action: "buy",
        targetWeightPct: 10,
        limitPrice: 0.71,
      }),
    ]);

    expect(result.planned).toEqual([]);
    expect(result.violations).toEqual([
      expect.objectContaining({ code: "limit_too_far", symbol: "VOD.L" }),
    ]);
    expect(result.violations[0]?.message).toMatch(
      /0\.71p is 99% below the last close of 72\.00p.*pence/,
    );
  });

  it("keeps the cash of an open buy reserved until the decision cancels it", () => {
    const msftOrder = openOrder({
      symbol: "MSFT",
      side: "buy",
      quantity: 40,
      limitPrice: 400,
    });
    const buyApple = action({
      symbol: "AAPL",
      action: "buy",
      targetWeightPct: 20,
      limitPrice: 198,
    });

    const reserved = plan([buyApple], { openOrders: [msftOrder] });
    expect(codes(reserved)).toEqual([["AAPL", "insufficient_cash"]]);
    expect(reserved.violations[0]?.message).toContain(
      "£12,819.20 held for other buys",
    );

    const freed = plan(
      [buyApple, action({ symbol: "MSFT", action: "cancel_order" })],
      { openOrders: [msftOrder] },
    );
    expect(freed.violations).toEqual([]);
    expect(freed.cancelOrderIds).toEqual([msftOrder.id]);
    expect(freed.planned[0]).toMatchObject({ symbol: "AAPL", quantity: 25 });
  });

  it("cuts a buy that is a little short of cash and records it", () => {
    const result = plan(
      [
        action({
          symbol: "AAPL",
          action: "buy",
          targetWeightPct: 20,
          limitPrice: 198,
        }),
      ],
      {
        limits: {
          maxPositionWeightPct: 20,
          maxSectorWeightPct: 40,
          // Leaves £3,903.12 free; 25 shares cost £3,965.94 with fees.
          minCashWeightPct: 63.2,
          maxUsdWeightPct: 50,
          maxPositions: 10,
        },
      },
    );

    expect(result.violations).toEqual([]);
    expect(result.planned[0]?.quantity).toBe(24);
    expect(result.adjustments).toEqual([
      expect.objectContaining({
        code: "quantity_cut_for_cash",
        symbol: "AAPL",
      }),
    ]);
  });

  it("allows a second buy of a symbol only beside a cancel of the first", () => {
    const appleOrder = openOrder({
      symbol: "AAPL",
      side: "buy",
      quantity: 10,
      limitPrice: 195,
    });
    const buyApple = action({
      symbol: "AAPL",
      action: "buy",
      targetWeightPct: 10,
      limitPrice: 198,
    });

    expect(codes(plan([buyApple], { openOrders: [appleOrder] }))).toEqual([
      ["AAPL", "open_order_exists"],
    ]);
    const replaced = plan(
      [buyApple, action({ symbol: "AAPL", action: "cancel_order" })],
      { openOrders: [appleOrder] },
    );
    expect(replaced.violations).toEqual([]);
    expect(replaced.cancelOrderIds).toEqual([appleOrder.id]);
    expect(replaced.planned[0]?.quantity).toBe(12);
  });

  it("needs exactly one action for each held stock and a known symbol", () => {
    const result = plan(
      [
        action({ symbol: "VOD.L", action: "hold" }),
        action({ symbol: "VOD.L", action: "sell", targetWeightPct: 0 }),
        action({ symbol: "ZZZ", action: "buy" }),
        action({ symbol: "AZN.L", action: "cancel_order" }),
        action({
          symbol: "SHEL.L",
          action: "sell",
          targetWeightPct: 0,
          limitPrice: 2600,
        }),
      ],
      { addHolds: false },
    );

    expect(codes(result)).toEqual([
      ["BP.L", "missing_action"],
      ["VOD.L", "duplicate_action"],
      ["ZZZ", "not_in_universe"],
      ["AZN.L", "no_open_order"],
      ["SHEL.L", "not_held"],
    ]);
  });

  it("checks the fields of each order", () => {
    const result = plan(
      [
        action({ symbol: "MSFT", action: "buy", targetWeightPct: 5 }),
        action({
          symbol: "AAPL",
          action: "buy",
          targetWeightPct: 5,
          limitPrice: 198,
          validSessions: 6,
        }),
        action({
          symbol: "SHEL.L",
          action: "buy",
          targetWeightPct: 5,
          limitPrice: 2600,
        }),
        action({
          symbol: "AZN.L",
          action: "buy",
          targetWeightPct: 5,
          limitPrice: 12_000,
        }),
        action({
          symbol: "VOD.L",
          action: "sell",
          targetWeightPct: 0,
          limitPrice: 72,
          onExpiry: "reprice",
          repriceLimit: 74,
        }),
        action({
          symbol: "BP.L",
          action: "buy",
          targetWeightPct: 10,
          limitPrice: 410,
        }),
      ],
      {
        symbolsWithThesis: new Set(["VOD.L", "BP.L", "AAPL", "MSFT", "AZN.L"]),
        bars: new Map([...BARS].filter(([symbol]) => symbol !== "AZN.L")),
      },
    );

    expect(codes(result)).toEqual([
      ["MSFT", "missing_field"],
      ["AAPL", "invalid_valid_sessions"],
      ["SHEL.L", "missing_thesis"],
      ["AZN.L", "no_price"],
      ["VOD.L", "invalid_reprice_limit"],
      ["BP.L", "target_already_met"],
    ]);
    expect(result.violations[0]?.message).toContain("limitPrice");
  });

  it("rejects an impossible target and a sale of shares already on order", () => {
    const result = plan(
      [
        action({
          symbol: "AAPL",
          action: "buy",
          targetWeightPct: -5,
          limitPrice: 198,
        }),
        action({
          symbol: "VOD.L",
          action: "sell",
          targetWeightPct: 0,
          limitPrice: 72,
        }),
      ],
      {
        openOrders: [
          openOrder({
            symbol: "VOD.L",
            side: "sell",
            quantity: 2000,
            limitPrice: 0.75,
          }),
        ],
      },
    );

    expect(codes(result)).toEqual([
      ["AAPL", "invalid_target_weight"],
      ["VOD.L", "shares_reserved"],
    ]);
  });

  it("holds each buy to the position, sector, USD and count limits", () => {
    const result = plan(
      [
        action({
          symbol: "AAPL",
          action: "buy",
          targetWeightPct: 25,
          limitPrice: 198,
        }),
        action({
          symbol: "MSFT",
          action: "buy",
          targetWeightPct: 15,
          limitPrice: 400,
        }),
        action({
          symbol: "SHEL.L",
          action: "buy",
          targetWeightPct: 20,
          limitPrice: 2600,
        }),
        action({
          symbol: "AZN.L",
          action: "buy",
          targetWeightPct: 5,
          limitPrice: 12_000,
        }),
        action({
          symbol: "VOD.L",
          action: "buy",
          targetWeightPct: 7.3,
          limitPrice: 71,
        }),
      ],
      {
        limits: {
          maxPositionWeightPct: 20,
          maxSectorWeightPct: 25,
          minCashWeightPct: 5,
          maxUsdWeightPct: 10,
          maxPositions: 2,
        },
      },
    );

    expect(codes(result)).toEqual([
      ["AAPL", "position_limit"],
      // The fund holds two stocks, so each new one breaks the count.
      ["MSFT", "usd_limit"],
      ["MSFT", "position_count_limit"],
      // BP.L and SHEL.L make 30.1% of the fund.
      ["SHEL.L", "sector_limit"],
      ["SHEL.L", "position_count_limit"],
      ["AZN.L", "position_count_limit"],
      // 65 more shares are worth £46.15.
      ["VOD.L", "order_too_small"],
    ]);
    expect(result.violations[0]?.message).toContain(
      "Lower it by at least 5 percentage points",
    );
  });

  it("sells only unlocked shares that no open order has taken", () => {
    const portfolio = testPortfolio([
      fill({
        symbol: "VOD.L",
        side: "buy",
        quantity: 2000,
        price: 0.7,
        filledOn: "2026-10-01",
      }),
      fill({
        symbol: "VOD.L",
        side: "buy",
        quantity: 1000,
        price: 0.7,
        filledOn: "2026-11-10",
      }),
      fill({
        symbol: "BP.L",
        side: "buy",
        quantity: 500,
        price: 4,
        filledOn: "2026-11-02",
      }),
    ]);
    const result = plan(
      [
        action({
          symbol: "VOD.L",
          action: "sell",
          targetWeightPct: 0,
          limitPrice: 72,
        }),
        action({
          symbol: "BP.L",
          action: "sell",
          targetWeightPct: 5,
          limitPrice: 410,
        }),
      ],
      {
        portfolio,
        openOrders: [
          openOrder({
            symbol: "VOD.L",
            side: "sell",
            quantity: 500,
            limitPrice: 0.75,
          }),
        ],
      },
    );

    expect(result.planned).toEqual([
      expect.objectContaining({
        symbol: "VOD.L",
        side: "sell",
        // 2,000 unlocked, less the 500 of the open order.
        quantity: 1500,
        estimatedValueGbp: 1080,
        estimatedFeesGbp: 0,
      }),
    ]);
    expect(result.adjustments).toEqual([
      expect.objectContaining({ code: "locked_shares_kept", symbol: "VOD.L" }),
    ]);
    expect(result.adjustments[0]?.message).toContain(
      "1,000 shares stay locked until 2026-12-10",
    );
    expect(codes(result)).toEqual([["BP.L", "shares_locked"]]);
    expect(result.violations[0]?.message).toContain("sellable from 2026-12-02");
  });
});
