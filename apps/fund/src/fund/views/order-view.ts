import { formatPrice } from "../orders/format-price.ts";
import type { Instrument, Order } from "../types.ts";

export interface OrderView {
  id: string;
  side: Order["side"];
  quantity: number;
  symbol: string;
  name: string;
  limitText: string;
  validUntil: string;
}

/** An order as a row shows it, with its limit written as the broker quotes it. */
export function orderView(
  order: Pick<
    Order,
    "id" | "side" | "quantity" | "symbol" | "limitPrice" | "validUntil"
  >,
  instrument: Instrument,
): OrderView {
  return {
    id: order.id,
    side: order.side,
    quantity: order.quantity,
    symbol: order.symbol,
    name: instrument.name,
    limitText: formatPrice(order.limitPrice, instrument),
    validUntil: order.validUntil,
  };
}
