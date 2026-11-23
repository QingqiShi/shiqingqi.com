import type { PmAction } from "../contracts/pm-decision-schema.ts";
import { GUARDRAILS } from "../guardrails.ts";
import { instrumentOf, optionalInstrumentOf } from "../ledger/instrument-of.ts";
import { roundPennies } from "../ledger/round-pennies.ts";
import { toGbp } from "../ledger/to-gbp.ts";
import type { Instrument, ValuedPosition } from "../types.ts";
import { addWeekdays } from "./add-weekdays.ts";
import { clampLimits } from "./clamp-limits.ts";
import { estimateFeesGbp } from "./estimate-fees-gbp.ts";
import { formatCount, formatPct, formatPoints } from "./format-pct.ts";
import { formatGbp, formatPrice } from "./format-price.ts";
import { toMajorUnits } from "./to-major-units.ts";
import type {
  OrderAdjustment,
  OrderPlan,
  OrderSide,
  OrderTerms,
  OrderViolation,
  OrderViolationCode,
  PlannedOrder,
  PlanOrdersInput,
} from "./types.ts";

/**
 * A buy may come out smaller than its target when cash is short by this share
 * of its shares or less (fees and rounding); a larger gap is a violation.
 */
export const CASH_SHORTFALL_TOLERANCE_PCT = 2;

/** Room for float noise, so that a 20% target meets a 20% limit. */
const EPSILON = 1e-9;

/**
 * Turns the PM's actions into orders and finds every breach of the rules.
 * An order whose symbol has a breach is never placed: it is in `blocked`,
 * not in `planned`. `limits` is the risk policy's; it is clamped to the
 * guardrails again here.
 */
export function planOrders(input: PlanOrdersInput): OrderPlan {
  const { actions, portfolio, instruments, bars, gbpUsd, asOf } = input;
  const limits = clampLimits(input.limits);
  const nav = portfolio.navGbp;
  const instrumentFor = instrumentOf(instruments);
  const findInstrument = optionalInstrumentOf(instruments);
  const heldBySymbol = new Map(portfolio.positions.map((p) => [p.symbol, p]));
  const openOrders = input.openOrders.filter((o) => o.status === "open");

  const planned: PlannedOrder[] = [];
  const violations: OrderViolation[] = [];
  const adjustments: OrderAdjustment[] = [];
  const violate = (
    code: OrderViolationCode,
    symbol: string,
    message: string,
  ) => {
    violations.push({ code, symbol, message });
  };

  const actionsBySymbol = new Map<string, PmAction[]>();
  for (const action of actions) {
    const list = actionsBySymbol.get(action.symbol) ?? [];
    list.push(action);
    actionsBySymbol.set(action.symbol, list);
  }

  for (const position of portfolio.positions) {
    if (!actionsBySymbol.has(position.symbol)) {
      violate(
        "missing_action",
        position.symbol,
        `The fund holds ${formatCount(position.quantity, "share")} of ${position.symbol} but the decision has no action for it. Give it one: buy, sell or hold.`,
      );
    }
  }

  const cancels: PmAction[] = [];
  const trades: PmAction[] = [];
  for (const [symbol, list] of actionsBySymbol) {
    const instrument = findInstrument(symbol);
    if (!instrument || instrument.kind !== "stock") {
      violate(
        "not_in_universe",
        symbol,
        `${symbol} is not a stock the fund may trade. Use only symbols of the screened universe.`,
      );
      continue;
    }
    const cancelActions = list.filter((a) => a.action === "cancel_order");
    const otherActions = list.filter((a) => a.action !== "cancel_order");
    if (cancelActions.length > 1 || otherActions.length > 1) {
      violate(
        "duplicate_action",
        symbol,
        `The decision has ${String(list.length)} actions for ${symbol}. Give one buy, sell or hold, plus at most one cancel_order.`,
      );
    }
    if (cancelActions[0]) cancels.push(cancelActions[0]);
    if (otherActions[0]) trades.push(otherActions[0]);
  }

  const cancelOrderIds: string[] = [];
  for (const action of cancels) {
    const ids = openOrders
      .filter((o) => o.symbol === action.symbol)
      .map((o) => o.id);
    if (ids.length === 0) {
      violate(
        "no_open_order",
        action.symbol,
        `cancel_order for ${action.symbol}: there is no open order for it to cancel.`,
      );
    }
    cancelOrderIds.push(...ids);
  }
  const liveOrders = openOrders.filter((o) => !cancelOrderIds.includes(o.id));

  const orderCostGbp = (
    instrument: Instrument,
    side: OrderSide,
    quantity: number,
    price: number,
  ) => {
    const valueGbp = roundPennies(toGbp(quantity * price, instrument, gbpUsd));
    const feesGbp = estimateFeesGbp({
      instrument,
      side,
      quantity,
      price,
      gbpUsd,
    });
    return { valueGbp, feesGbp };
  };

  /** GBP that each symbol will weigh if every buy fills; sells are not counted. */
  const exposureGbp = new Map(
    portfolio.positions.map((p) => [p.symbol, p.marketValueGbp]),
  );
  let reservedCashGbp = 0;
  for (const order of liveOrders) {
    if (order.side !== "buy") continue;
    const { valueGbp, feesGbp } = orderCostGbp(
      instrumentFor(order.symbol),
      "buy",
      order.quantity,
      order.limitPrice,
    );
    reservedCashGbp += valueGbp + feesGbp;
    exposureGbp.set(
      order.symbol,
      (exposureGbp.get(order.symbol) ?? 0) + valueGbp,
    );
  }
  const minCashGbp = roundPennies((limits.minCashWeightPct / 100) * nav);

  const lastClose = (symbol: string) => bars.get(symbol)?.at(-1);

  const checkDistance = (
    action: PmAction,
    instrument: Instrument,
    price: number,
    close: { close: number; date: string },
    what: string,
  ) => {
    const distancePct = (price / close.close - 1) * 100;
    if (Math.abs(distancePct) <= GUARDRAILS.maxLimitDistancePct + EPSILON) {
      return true;
    }
    const pence =
      instrument.quoteScale === 100 && Math.abs(distancePct) >= 90
        ? " London prices are in pence, not pounds."
        : "";
    violate(
      "limit_too_far",
      action.symbol,
      `${action.action} ${action.symbol}: the ${what} ${formatPrice(price, instrument)} is ${formatPct(Math.abs(distancePct))} ${distancePct > 0 ? "above" : "below"} the last close of ${formatPrice(close.close, instrument)} (${close.date}). It may be at most ${formatPct(GUARDRAILS.maxLimitDistancePct)} from it.${pence}`,
    );
    return false;
  };

  const readTerms = (
    action: PmAction,
    instrument: Instrument,
  ): OrderTerms | null => {
    const { symbol } = action;
    const missing = [
      action.limitPrice === null && "limitPrice",
      action.targetWeightPct === null && "targetWeightPct",
      action.validSessions === null && "validSessions",
      action.onExpiry === null && "onExpiry",
      !action.unfilledPlan?.trim() && "unfilledPlan",
    ].filter((field) => field !== false);
    if (missing.length > 0) {
      violate(
        "missing_field",
        symbol,
        `${action.action} ${symbol} needs ${missing.join(", ")}.`,
      );
    }
    const { targetWeightPct, validSessions } = action;
    let valid = missing.length === 0;
    if (
      targetWeightPct !== null &&
      (targetWeightPct < 0 ||
        targetWeightPct > 100 ||
        (action.action === "buy" && targetWeightPct <= 0))
    ) {
      violate(
        "invalid_target_weight",
        symbol,
        `${action.action} ${symbol}: a target weight of ${formatPct(targetWeightPct)} is not possible. A buy needs more than 0% and a sell 0% to 100%.`,
      );
      valid = false;
    }
    if (
      validSessions !== null &&
      (!Number.isInteger(validSessions) ||
        validSessions < 1 ||
        validSessions > GUARDRAILS.maxOrderSessions)
    ) {
      violate(
        "invalid_valid_sessions",
        symbol,
        `${action.action} ${symbol}: validSessions is ${String(validSessions)}; it must be a whole number from 1 to ${String(GUARDRAILS.maxOrderSessions)}.`,
      );
      valid = false;
    }
    if (
      action.action === "buy" &&
      action.thesis === null &&
      !input.symbolsWithThesis.has(symbol)
    ) {
      violate(
        "missing_thesis",
        symbol,
        `buy ${symbol}: the fund has no thesis for ${symbol} yet, so a first buy must include one.`,
      );
      valid = false;
    }

    const close = lastClose(symbol);
    if (!close) {
      violate(
        "no_price",
        symbol,
        `${action.action} ${symbol}: there is no recent close to check the limit against.`,
      );
      return null;
    }
    if (
      !valid ||
      action.limitPrice === null ||
      targetWeightPct === null ||
      validSessions === null ||
      action.onExpiry === null ||
      action.unfilledPlan === null
    ) {
      return null;
    }

    const limit = toMajorUnits(action.limitPrice, instrument);
    if (!checkDistance(action, instrument, limit, close, "limit")) return null;

    let repriceLimit: number | null = null;
    if (action.onExpiry === "reprice") {
      if (action.repriceLimit === null) {
        violate(
          "invalid_reprice_limit",
          symbol,
          `${action.action} ${symbol}: onExpiry is reprice, so it needs a repriceLimit, the worst limit you would accept later.`,
        );
        return null;
      }
      repriceLimit = toMajorUnits(action.repriceLimit, instrument);
      const worse =
        action.action === "buy" ? repriceLimit >= limit : repriceLimit <= limit;
      if (!worse) {
        violate(
          "invalid_reprice_limit",
          symbol,
          `${action.action} ${symbol}: the repriceLimit ${formatPrice(repriceLimit, instrument)} must be ${action.action === "buy" ? "at or above" : "at or below"} the limit ${formatPrice(limit, instrument)}, since a reprice chases the price.`,
        );
        return null;
      }
      if (
        !checkDistance(action, instrument, repriceLimit, close, "repriceLimit")
      ) {
        return null;
      }
    }
    return {
      limit,
      targetWeightPct,
      validSessions,
      onExpiry: action.onExpiry,
      repriceLimit,
      unfilledPlan: action.unfilledPlan.trim(),
    };
  };

  const plan = (
    action: PmAction,
    instrument: Instrument,
    side: OrderSide,
    terms: OrderTerms,
    quantity: number,
    weightAfterPct: number,
  ) => {
    const { valueGbp, feesGbp } = orderCostGbp(
      instrument,
      side,
      quantity,
      terms.limit,
    );
    const order: PlannedOrder = {
      symbol: action.symbol,
      side,
      quantity,
      limitPrice: terms.limit,
      placedFor: asOf,
      validUntil: addWeekdays(asOf, terms.validSessions - 1),
      onExpiry: terms.onExpiry,
      repriceLimit: terms.repriceLimit,
      unfilledPlan: terms.unfilledPlan,
      rationale: action.rationale,
      estimatedValueGbp: valueGbp,
      estimatedFeesGbp: feesGbp,
      weightAfterPct,
    };
    planned.push(order);
    return order;
  };

  const planBuy = (action: PmAction, instrument: Instrument) => {
    const { symbol } = action;
    if (!instrument.active) {
      violate(
        "not_in_universe",
        symbol,
        `buy ${symbol}: ${symbol} has left the universe; the fund may only sell or hold it.`,
      );
      return;
    }
    const terms = readTerms(action, instrument);
    if (!terms) return;

    if (liveOrders.some((o) => o.symbol === symbol && o.side === "buy")) {
      violate(
        "open_order_exists",
        symbol,
        `buy ${symbol}: an open buy order for ${symbol} is still live. Add a cancel_order for ${symbol} to replace it, or hold.`,
      );
      return;
    }
    if (terms.targetWeightPct > limits.maxPositionWeightPct + EPSILON) {
      violate(
        "position_limit",
        symbol,
        `buy ${symbol}: a target of ${formatPct(terms.targetWeightPct)} is above the ${formatPct(limits.maxPositionWeightPct)} limit for one stock. Lower it by at least ${formatPoints(terms.targetWeightPct - limits.maxPositionWeightPct)}.`,
      );
      return;
    }

    const limitGbp = toGbp(terms.limit, instrument, gbpUsd);
    const held = heldBySymbol.get(symbol)?.quantity ?? 0;
    const weightAt = (quantity: number) =>
      (((held + quantity) * limitGbp) / nav) * 100;
    const wanted =
      Math.floor(((terms.targetWeightPct / 100) * nav) / limitGbp + EPSILON) -
      held;
    if (wanted <= 0) {
      violate(
        "target_already_met",
        symbol,
        `buy ${symbol}: the fund's ${formatCount(held, "share")} already weigh ${formatPct(weightAt(0))} at the limit, which meets the ${formatPct(terms.targetWeightPct)} target. Raise the target or hold.`,
      );
      return;
    }

    const costOf = (quantity: number) => {
      const { valueGbp, feesGbp } = orderCostGbp(
        instrument,
        "buy",
        quantity,
        terms.limit,
      );
      return valueGbp + feesGbp;
    };
    const availableGbp = portfolio.cashGbp - reservedCashGbp - minCashGbp;
    let quantity = wanted;
    if (costOf(wanted) > availableGbp + EPSILON) {
      const feeRatio = costOf(wanted) / (wanted * limitGbp);
      let fit = Math.max(0, Math.floor(availableGbp / (limitGbp * feeRatio)));
      while (fit > 0 && costOf(fit) > availableGbp + EPSILON) fit -= 1;
      const tolerance = Math.max(
        1,
        Math.ceil((wanted * CASH_SHORTFALL_TOLERANCE_PCT) / 100),
      );
      if (fit === 0 || wanted - fit > tolerance) {
        violate(
          "insufficient_cash",
          symbol,
          `buy ${symbol}: ${formatCount(wanted, "share")} at ${formatPrice(terms.limit, instrument)} cost about ${formatGbp(costOf(wanted))} with fees, but only ${formatGbp(Math.max(0, availableGbp))} is free: ${formatGbp(portfolio.cashGbp)} of cash, less ${formatGbp(reservedCashGbp)} held for other buys and the ${formatGbp(minCashGbp)} minimum cash (${formatPct(limits.minCashWeightPct)}). ${fit > 0 ? `The most that fits is a target of about ${formatPct(weightAt(fit))}.` : "Sell something first or cancel another buy."}`,
        );
        return;
      }
      adjustments.push({
        code: "quantity_cut_for_cash",
        symbol,
        message: `buy ${symbol}: cut from ${formatCount(wanted, "share")} to ${String(fit)}, so that the cost with fees fits the ${formatGbp(availableGbp)} of free cash.`,
      });
      quantity = fit;
    }

    const valueGbp = roundPennies(
      toGbp(quantity * terms.limit, instrument, gbpUsd),
    );
    if (valueGbp < GUARDRAILS.minOrderGbp) {
      violate(
        "order_too_small",
        symbol,
        `buy ${symbol}: the order is worth ${formatGbp(valueGbp)}, under the ${formatGbp(GUARDRAILS.minOrderGbp)} minimum. Raise the target or hold.`,
      );
      return;
    }

    const newExposureGbp = (held + quantity) * limitGbp;
    const after = new Map(exposureGbp).set(symbol, newExposureGbp);
    const weightOf = (keep: (i: Instrument) => boolean) =>
      ([...after].reduce(
        (sum, [s, gbp]) => (keep(instrumentFor(s)) ? sum + gbp : sum),
        0,
      ) /
        nav) *
      100;
    let fits = true;
    const sector = instrument.sector ?? "Unknown";
    const sectorPct = weightOf((i) => (i.sector ?? "Unknown") === sector);
    if (sectorPct > limits.maxSectorWeightPct + EPSILON) {
      violate(
        "sector_limit",
        symbol,
        `buy ${symbol}: it takes ${sector} to ${formatPct(sectorPct)} of the fund, above the ${formatPct(limits.maxSectorWeightPct)} sector limit. Lower the target by at least ${formatPoints(sectorPct - limits.maxSectorWeightPct)}.`,
      );
      fits = false;
    }
    if (instrument.currency === "USD") {
      const usdPct = weightOf((i) => i.currency === "USD");
      if (usdPct > limits.maxUsdWeightPct + EPSILON) {
        violate(
          "usd_limit",
          symbol,
          `buy ${symbol}: it takes USD stocks to ${formatPct(usdPct)} of the fund, above the ${formatPct(limits.maxUsdWeightPct)} limit. Lower the target by at least ${formatPoints(usdPct - limits.maxUsdWeightPct)}.`,
        );
        fits = false;
      }
    }
    if (!exposureGbp.has(symbol) && after.size > limits.maxPositions) {
      violate(
        "position_count_limit",
        symbol,
        `buy ${symbol}: it makes ${String(after.size)} positions, counting open and planned buys, above the limit of ${String(limits.maxPositions)}. Drop a buy or sell a position first.`,
      );
      fits = false;
    }
    if (!fits) return;

    const order = plan(
      action,
      instrument,
      "buy",
      terms,
      quantity,
      weightAt(quantity),
    );
    exposureGbp.set(symbol, newExposureGbp);
    reservedCashGbp += order.estimatedValueGbp + order.estimatedFeesGbp;
  };

  const planSell = (action: PmAction, instrument: Instrument) => {
    const { symbol } = action;
    const position = heldBySymbol.get(symbol);
    if (!position) {
      violate(
        "not_held",
        symbol,
        `sell ${symbol}: the fund holds no ${symbol}. It is long-only and cannot sell short.`,
      );
      return;
    }
    const terms = readTerms(action, instrument);
    if (!terms) return;

    const reserved = liveOrders
      .filter((o) => o.symbol === symbol && o.side === "sell")
      .reduce((sum, o) => sum + o.quantity, 0);
    const free = Math.max(0, position.quantity - reserved);
    const unlockedFree = Math.max(0, position.unlockedQuantity - reserved);
    const limitGbp = toGbp(terms.limit, instrument, gbpUsd);
    const weightAt = (quantity: number) =>
      (((free - quantity) * limitGbp) / nav) * 100;

    if (free === 0) {
      violate(
        "shares_reserved",
        symbol,
        `sell ${symbol}: all ${formatCount(position.quantity, "share")} are already in open sell orders. Cancel them first to sell at a new limit.`,
      );
      return;
    }
    const keep =
      terms.targetWeightPct === 0
        ? 0
        : Math.floor(
            ((terms.targetWeightPct / 100) * nav) / limitGbp + EPSILON,
          );
    const wanted = free - keep;
    if (wanted <= 0) {
      violate(
        "target_already_met",
        symbol,
        `sell ${symbol}: the position weighs ${formatPct(weightAt(0))} at the limit${reserved > 0 ? " after its open sell orders" : ""}, already at or under the ${formatPct(terms.targetWeightPct)} target. Lower the target or hold.`,
      );
      return;
    }

    let quantity = wanted;
    if (wanted > unlockedFree) {
      const sellableOn = dateAllSellable(position, reserved + wanted);
      if (terms.targetWeightPct === 0 && unlockedFree > 0) {
        adjustments.push({
          code: "locked_shares_kept",
          symbol,
          message: `sell ${symbol}: sells the ${formatCount(unlockedFree, "unlocked share")}; ${formatCount(wanted - unlockedFree, "share")} stay locked until ${sellableOn}.`,
        });
        quantity = unlockedFree;
      } else {
        violate(
          "shares_locked",
          symbol,
          `sell ${symbol}: the sale needs ${formatCount(wanted, "share")} but only ${String(unlockedFree)} are past the ${String(GUARDRAILS.minHoldDays)}-day hold${reserved > 0 ? " and not already in an open sell order" : ""}. The shares it needs are all sellable from ${sellableOn}. ${unlockedFree > 0 ? `Sell at most ${String(unlockedFree)} now, or wait.` : "Hold until then."}`,
        );
        return;
      }
    }
    plan(action, instrument, "sell", terms, quantity, weightAt(quantity));
  };

  for (const action of trades) {
    const instrument = instrumentFor(action.symbol);
    if (action.action === "buy") planBuy(action, instrument);
    if (action.action === "sell") planSell(action, instrument);
  }

  const broken = new Set(violations.map((v) => v.symbol));
  return {
    planned: planned.filter((o) => !broken.has(o.symbol)),
    blocked: planned.filter((o) => broken.has(o.symbol)),
    cancelOrderIds,
    violations,
    adjustments,
  };
}

/** The date when the oldest `quantity` shares of a position are all unlocked. */
function dateAllSellable(position: ValuedPosition, quantity: number): string {
  let counted = 0;
  for (const lot of position.lots) {
    counted += lot.quantity;
    if (counted >= quantity) return lot.unlockOn;
  }
  return position.lots.at(-1)?.unlockOn ?? "";
}
