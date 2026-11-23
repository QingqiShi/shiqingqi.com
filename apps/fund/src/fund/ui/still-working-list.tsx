import { List } from "@tuja/ui/components/list";
import type { StillWorkingOrderView } from "../views/load-desk.ts";
import { OrderRow } from "./order-row.tsx";

/** Open orders that earlier meetings placed and that still work at the broker. */
export function StillWorkingList({
  orders,
}: {
  orders: readonly StillWorkingOrderView[];
}) {
  return (
    <List>
      {orders.map((order) => (
        <OrderRow
          key={order.id}
          order={order}
          placedOn={order.meetingAsOf}
          note={order.note}
        />
      ))}
    </List>
  );
}
