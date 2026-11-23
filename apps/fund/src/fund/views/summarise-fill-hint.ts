import { fillHint } from "../orders/fill-hint.ts";
import type { BarsBySymbol, Order } from "../types.ts";

/** Prices are major units. `extreme` is the low of a buy's session or the high of a sell's. */
export type FillHintSummary =
  | {
      kind: "reachable";
      date: string;
      extreme: number;
      /** What the order would have got. */
      price: number;
    }
  | {
      kind: "unreachable";
      /** The session that came closest to the limit. */
      date: string;
      extreme: number;
    }
  | { kind: "no_sessions" };

/**
 * What the stored prices say about an order in the sessions the owner has
 * not answered for yet: the first session that reached its limit, or the
 * one that came closest. A session with no stored bar is skipped.
 */
export function summariseFillHint(
  order: Pick<
    Order,
    | "symbol"
    | "side"
    | "limitPrice"
    | "placedFor"
    | "validUntil"
    | "checkedThrough"
  >,
  bars: BarsBySymbol,
  through: string,
): FillHintSummary {
  const sessions = fillHint(order, bars).filter(
    (session) =>
      session.date <= through &&
      (order.checkedThrough === null || session.date > order.checkedThrough),
  );
  const reached = sessions.find((session) => session.reachable);
  if (reached?.price != null) {
    return {
      kind: "reachable",
      date: reached.date,
      extreme: reached.extreme,
      price: reached.price,
    };
  }
  let closest: { date: string; extreme: number } | null = null;
  for (const { date, extreme } of sessions) {
    const isCloser =
      closest === null ||
      (order.side === "buy"
        ? extreme < closest.extreme
        : extreme > closest.extreme);
    if (isCloser) closest = { date, extreme };
  }
  return closest === null
    ? { kind: "no_sessions" }
    : { kind: "unreachable", ...closest };
}
