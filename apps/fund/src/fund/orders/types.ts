import type { PmAction } from "../contracts/pm-decision-schema.ts";
import type {
  BarsBySymbol,
  Instrument,
  Order,
  ValuedPortfolio,
} from "../types.ts";
import type { RiskLimits } from "./clamp-limits.ts";

export type OrderSide = "buy" | "sell";

/** An order ready for the owner to place. Prices are major units. */
export interface PlannedOrder {
  symbol: string;
  side: OrderSide;
  quantity: number;
  limitPrice: number;
  placedFor: string;
  validUntil: string;
  onExpiry: Order["onExpiry"];
  repriceLimit: number | null;
  unfilledPlan: string;
  rationale: string;
  estimatedValueGbp: number;
  estimatedFeesGbp: number;
  /** The weight of the position once the order fills, at its limit. */
  weightAfterPct: number;
}

export type OrderViolationCode =
  | "not_in_universe"
  | "missing_action"
  | "duplicate_action"
  | "missing_field"
  | "invalid_target_weight"
  | "invalid_valid_sessions"
  | "missing_thesis"
  | "no_price"
  | "limit_too_far"
  | "invalid_reprice_limit"
  | "open_order_exists"
  | "target_already_met"
  | "position_limit"
  | "sector_limit"
  | "usd_limit"
  | "position_count_limit"
  | "insufficient_cash"
  | "order_too_small"
  | "not_held"
  | "shares_reserved"
  | "shares_locked"
  | "no_open_order";

/** A breach the PM must fix. The message says what is wrong and by how much. */
export interface OrderViolation {
  code: OrderViolationCode;
  symbol: string;
  message: string;
}

export type OrderAdjustmentCode =
  "quantity_cut_for_cash" | "locked_shares_kept";

/** A change that code made to an action so that it fits the rules. */
export interface OrderAdjustment {
  code: OrderAdjustmentCode;
  symbol: string;
  message: string;
}

export interface PlanOrdersInput {
  actions: readonly PmAction[];
  portfolio: ValuedPortfolio;
  /** Orders with status `open`; other statuses are ignored. */
  openOrders: readonly Order[];
  instruments: readonly Instrument[];
  /** Cut to the sessions before `asOf`. */
  bars: BarsBySymbol;
  /** USD for one GBP. */
  gbpUsd: number;
  limits: RiskLimits;
  symbolsWithThesis: ReadonlySet<string>;
  asOf: string;
}

export interface OrderPlan {
  planned: PlannedOrder[];
  /** Orders that code derived but that are never placed: their symbol has a breach. */
  blocked: PlannedOrder[];
  cancelOrderIds: string[];
  violations: OrderViolation[];
  adjustments: OrderAdjustment[];
}

/** The checked fields of a buy or a sell. Prices are major units. */
export interface OrderTerms {
  limit: number;
  targetWeightPct: number;
  validSessions: number;
  onExpiry: Order["onExpiry"];
  repriceLimit: number | null;
  unfilledPlan: string;
}
