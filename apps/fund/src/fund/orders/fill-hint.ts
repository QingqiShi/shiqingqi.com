import type { BarsBySymbol, Order } from "../types.ts";

export interface FillHintSession {
  date: string;
  /** Buy: the low reached the limit. Sell: the high reached it. */
  reachable: boolean;
  /** Major units: the session's low for a buy, its high for a sell. */
  extreme: number;
  /** What a limit order would have got, in major units; null when unreachable. */
  price: number | null;
}

/**
 * For each stored session of the order: whether its limit was reachable, and
 * at what price. A buy that opens below its limit fills at the open, and a
 * sell that opens above its limit fills at the open. Only a hint: the owner
 * says what really happened.
 */
export function fillHint(
  order: Pick<
    Order,
    "symbol" | "side" | "limitPrice" | "placedFor" | "validUntil"
  >,
  bars: BarsBySymbol,
): FillHintSession[] {
  const limit = order.limitPrice;
  return (bars.get(order.symbol) ?? [])
    .filter(
      (bar) => bar.date >= order.placedFor && bar.date <= order.validUntil,
    )
    .map((bar) => {
      const extreme = order.side === "buy" ? bar.low : bar.high;
      const reachable =
        order.side === "buy" ? extreme <= limit : extreme >= limit;
      if (!reachable)
        return { date: bar.date, reachable, extreme, price: null };
      const price =
        order.side === "buy"
          ? Math.min(bar.open, limit)
          : Math.max(bar.open, limit);
      return { date: bar.date, reachable, extreme, price };
    });
}
