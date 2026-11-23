import type { Order } from "../types.ts";
import { addWeekdays } from "./add-weekdays.ts";

/**
 * The open orders whose owner has not yet said what happened in each of
 * their sessions before `asOf`, each with `through`: the last session the
 * owner answers for now. A meeting waits while there is one.
 */
export function ordersNeedingCheck<
  T extends Pick<
    Order,
    "status" | "placedFor" | "validUntil" | "checkedThrough"
  >,
>(openOrders: readonly T[], asOf: string): { order: T; through: string }[] {
  // The session before a Monday is the Friday, not the Sunday.
  const lastSession = addWeekdays(asOf, -1);
  return openOrders.flatMap((order) => {
    if (order.status !== "open" || order.placedFor >= asOf) return [];
    const through =
      order.validUntil < lastSession ? order.validUntil : lastSession;
    return order.checkedThrough === null || order.checkedThrough < through
      ? [{ order, through }]
      : [];
  });
}
