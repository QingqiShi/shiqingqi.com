import type { Order } from "../types.ts";

export function statusAfterCheck(
  order: Pick<Order, "status" | "validUntil">,
  checkedThrough: string,
): Order["status"] {
  if (order.status !== "open") return order.status;
  return checkedThrough >= order.validUntil ? "expired" : "open";
}
