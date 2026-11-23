import type { PmAction } from "../contracts/pm-decision-schema.ts";
import type { LedgerFill } from "../ledger/apply-fill.ts";
import { derivePortfolio } from "../ledger/derive-portfolio.ts";
import { TEST_FIXTURES } from "../ledger/test-fixtures.ts";
import { valuePortfolio } from "../ledger/value-portfolio.ts";
import type { Order } from "../types.ts";
import { planOrders } from "./plan-orders.ts";
import type { PlanOrdersInput } from "./types.ts";

const { fill, bar } = TEST_FIXTURES;

/** A Monday. */
export const AS_OF = "2026-11-23";
export const GBP_USD = 1.25;
export const INSTRUMENTS = Object.values(TEST_FIXTURES.instruments);
export const BARS = new Map(
  Object.entries({
    "VOD.L": 0.72,
    "BP.L": 4.1,
    "AZN.L": 120,
    "SHEL.L": 26,
    AAPL: 200,
    MSFT: 400,
  }).map(([symbol, close]) => [symbol, [bar("2026-11-20", close)]]),
);

/** 2,000 VOD.L, unlocked, and 500 BP.L, locked until 2026-12-02. */
export const HELD_FILLS = [
  fill({
    symbol: "VOD.L",
    side: "buy",
    quantity: 2000,
    price: 0.7,
    filledOn: "2026-10-01",
  }),
  fill({
    symbol: "BP.L",
    side: "buy",
    quantity: 500,
    price: 4,
    filledOn: "2026-11-02",
  }),
];

export function testPortfolio(fills: readonly LedgerFill[] = HELD_FILLS) {
  return valuePortfolio(
    derivePortfolio({
      fills,
      cashEntries: [{ date: "2026-01-02", kind: "deposit", amountGbp: 20_000 }],
      asOf: AS_OF,
    }),
    { instruments: INSTRUMENTS, bars: BARS, gbpUsd: GBP_USD },
  );
}

export function testAction(
  action: Pick<PmAction, "symbol" | "action"> & Partial<PmAction>,
): PmAction {
  const trade = action.action === "buy" || action.action === "sell";
  return {
    targetWeightPct: null,
    limitPrice: null,
    validSessions: trade ? 3 : null,
    onExpiry: trade ? "cancel" : null,
    repriceLimit: null,
    unfilledPlan: trade ? "Look again at the next meeting." : null,
    rationale: "Test.",
    thesis: null,
    thesisChangeNote: null,
    ...action,
  };
}

export function testOrder(
  order: Pick<Order, "symbol" | "side" | "quantity" | "limitPrice"> &
    Partial<Order>,
): Order {
  return {
    id: `open-${order.side}-${order.symbol}`,
    runId: "run",
    placedFor: "2026-11-20",
    validUntil: "2026-11-26",
    onExpiry: "cancel",
    repriceLimit: null,
    unfilledPlan: "Wait.",
    rationale: "Test.",
    thesisId: null,
    status: "open",
    checkedThrough: null,
    statusNote: null,
    createdAt: new Date("2026-11-20T07:00:00Z"),
    resolvedAt: null,
    ...order,
  };
}

/**
 * Plans the actions against the test portfolio. A held stock with no action
 * gets a hold, unless `addHolds` is false.
 */
export function testPlan(
  actions: PmAction[],
  {
    addHolds = true,
    ...overrides
  }: Partial<PlanOrdersInput> & { addHolds?: boolean } = {},
) {
  const portfolio = overrides.portfolio ?? testPortfolio();
  const holds = addHolds
    ? portfolio.positions
        .filter((p) => !actions.some((a) => a.symbol === p.symbol))
        .map((p) => testAction({ symbol: p.symbol, action: "hold" }))
    : [];
  return planOrders({
    actions: [...actions, ...holds],
    portfolio,
    openOrders: [],
    instruments: INSTRUMENTS,
    bars: BARS,
    gbpUsd: GBP_USD,
    limits: {
      maxPositionWeightPct: 20,
      maxSectorWeightPct: 40,
      minCashWeightPct: 5,
      maxUsdWeightPct: 50,
      maxPositions: 10,
    },
    symbolsWithThesis: new Set(INSTRUMENTS.map((i) => i.symbol)),
    asOf: AS_OF,
    ...overrides,
  });
}
