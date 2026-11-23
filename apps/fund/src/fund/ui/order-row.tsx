"use client";

import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { Disclosure } from "@tuja/ui/components/disclosure";
import { ListRow } from "@tuja/ui/components/list-row";
import type { DecisionNote } from "../views/load-desk.ts";
import type { OrderView } from "../views/order-view.ts";
import { displayDate } from "./display-date.ts";
import { MarkdownText } from "./markdown-text.tsx";
import { SideBadge } from "./side-badge.tsx";

/** An order that works at the broker, with the day a meeting placed it and today's view of the stock when there are such. */
export function OrderRow({
  order,
  placedOn = null,
  note = null,
}: {
  order: OrderView;
  placedOn?: string | null;
  note?: DecisionNote | null;
}) {
  const locale = useLocale();
  return (
    <ListRow
      wrap
      leading={<SideBadge side={order.side} />}
      detail={t({
        en: "{name} · good through {date}",
        zh: "{name} · 有效至 {date}",
      })
        .replace("{name}", order.name)
        .replace("{date}", displayDate(order.validUntil, locale, "weekday"))}
      value={order.limitText}
      valueDetail={
        placedOn === null
          ? null
          : t({ en: "Placed {date}", zh: "{date} 下单" }).replace(
              "{date}",
              displayDate(placedOn, locale, "day"),
            )
      }
      below={
        note === null ? undefined : (
          <Disclosure
            look="inline"
            summary={t({ en: "Today's view", zh: "今天的看法" })}
          >
            <MarkdownText>{note.rationale}</MarkdownText>
          </Disclosure>
        )
      }
    >
      {`${order.quantity.toLocaleString("en-GB")} × ${order.symbol}`}
    </ListRow>
  );
}
