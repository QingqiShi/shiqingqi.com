"use client";

import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import type { FillView, OpenOrderView } from "../views/load-portfolio.ts";
import { displayDate } from "./display-date.ts";
import { formatMoney } from "./format-money.ts";
import { OrderRow } from "./order-row.tsx";
import { SideBadge } from "./side-badge.tsx";

function FillRow({ fill }: { fill: FillView }) {
  const locale = useLocale();
  return (
    <ListRow
      wrap
      leading={<SideBadge side={fill.side} />}
      detail={`${displayDate(fill.filledOn, locale, "dayYear")} · ${fill.name}`}
      value={fill.priceText}
      valueDetail={
        fill.feesGbp > 0
          ? t({ en: "fees {fees}", zh: "费用 {fees}" }).replace(
              "{fees}",
              formatMoney(fill.feesGbp),
            )
          : null
      }
    >
      {`${fill.quantity.toLocaleString("en-GB")} × ${fill.symbol}`}
    </ListRow>
  );
}

/** Orders that are live with the broker, or the fills of the past, as rows. */
export function OrderRows(
  props:
    | { kind: "open"; orders: readonly OpenOrderView[] }
    | { kind: "fills"; fills: readonly FillView[] },
) {
  return (
    <List>
      {props.kind === "open"
        ? props.orders.map((order) => <OrderRow key={order.id} order={order} />)
        : props.fills.map((fill) => <FillRow key={fill.id} fill={fill} />)}
    </List>
  );
}
