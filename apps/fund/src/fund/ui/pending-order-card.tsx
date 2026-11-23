"use client";

import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import { postJson } from "@tuja/auth-ui/fetch-json";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { Card } from "@tuja/ui/components/card";
import { CardDescription } from "@tuja/ui/components/card-description";
import { CardHeader } from "@tuja/ui/components/card-header";
import { CardTitle } from "@tuja/ui/components/card-title";
import { Text } from "@tuja/ui/components/text";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PendingOrderView } from "../views/load-desk.ts";
import { displayDate } from "./display-date.ts";
import { FillSheet } from "./fill-sheet.tsx";
import { SideBadge } from "./side-badge.tsx";

function HintCallout({ order }: { order: PendingOrderView }) {
  const locale = useLocale();
  const { hint, hintText } = order;
  if (hint.kind === "no_sessions" || hintText === null) {
    return (
      <Callout intent="info">
        {t({
          en: "No prices are stored yet for the days it was live. Check the broker.",
          zh: "这几天的价格还没有存下来，请到券商那里查看。",
        })}
      </Callout>
    );
  }
  const day = displayDate(hint.date, locale, "weekday");
  if (hint.kind === "reachable") {
    const text =
      order.side === "buy"
        ? t({
            en: "On {day} the low was {extreme}, at or under your {limit} limit: it would have filled, at about {price}.",
            zh: "{day}最低价 {extreme}，触及你的限价 {limit}：应已成交，成交价约 {price}。",
          })
        : t({
            en: "On {day} the high was {extreme}, at or over your {limit} limit: it would have filled, at about {price}.",
            zh: "{day}最高价 {extreme}，触及你的限价 {limit}：应已成交，成交价约 {price}。",
          });
    return (
      <Callout intent="success" icon={null}>
        {text
          .replace("{day}", day)
          .replace("{extreme}", hintText.extreme)
          .replace("{limit}", order.limitText)
          .replace("{price}", hintText.price ?? order.limitText)}
      </Callout>
    );
  }
  const text =
    order.side === "buy"
      ? t({
          en: "The price never came down to your {limit} limit: the lowest was {extreme}, on {day}. It most likely did not fill.",
          zh: "价格没有跌到你的限价 {limit}：最低是 {day}的 {extreme}。很可能没有成交。",
        })
      : t({
          en: "The price never rose to your {limit} limit: the highest was {extreme}, on {day}. It most likely did not fill.",
          zh: "价格没有涨到你的限价 {limit}：最高是 {day}的 {extreme}。很可能没有成交。",
        });
  return (
    <Callout intent="info" icon={null}>
      {text
        .replace("{day}", day)
        .replace("{extreme}", hintText.extreme)
        .replace("{limit}", order.limitText)}
    </Callout>
  );
}

/**
 * One order that waits for the owner: what it was, what the prices say
 * happened, and the two answers.
 */
export function PendingOrderCard({ order }: { order: PendingOrderView }) {
  const locale = useLocale();
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shares =
    order.quantity === 1
      ? t({ en: "1 share", zh: "1 股" })
      : t({ en: "{n} shares", zh: "{n} 股" }).replace(
          "{n}",
          order.quantity.toLocaleString("en-GB"),
        );
  const through = displayDate(order.through, locale, "weekday");

  return (
    <Card>
      <div css={stack.item}>
        <CardHeader action={<SideBadge side={order.side} />}>
          <CardTitle level={3}>{`${shares} ${order.symbol}`}</CardTitle>
          <CardDescription>
            {t({
              en: "{name} · limit {limit} · live {from} to {to}",
              zh: "{name} · 限价 {limit} · 有效期 {from} 至 {to}",
            })
              .replace("{name}", order.name)
              .replace("{limit}", order.limitText)
              .replace(
                "{from}",
                displayDate(order.placedFor, locale, "weekday"),
              )
              .replace(
                "{to}",
                displayDate(order.validUntil, locale, "weekday"),
              )}
          </CardDescription>
        </CardHeader>
        <HintCallout order={order} />
        <Text as="p" look="bodySmall" tone="muted" measure="none">
          {t({
            en: "Did it fill by {day}? Check the broker, then say.",
            zh: "截至 {day} 成交了吗？请在券商处确认后回答。",
          }).replace("{day}", through)}
        </Text>
        <div css={cluster.tight}>
          <Button
            look="primary"
            icon={<CheckIcon weight="bold" />}
            disabled={saving}
            onClick={() => {
              setSheetOpen(true);
            }}
          >
            {t({ en: "Filled", zh: "已成交" })}
          </Button>
          <Button
            look="outline"
            icon={<XIcon weight="bold" />}
            loading={saving}
            onClick={() => {
              setSaving(true);
              setError(null);
              postJson(`/api/orders/${order.id}/no-fill`, {
                through: order.through,
              })
                .then(() => {
                  router.refresh();
                })
                .catch((cause: unknown) => {
                  setError(
                    cause instanceof Error ? cause.message : String(cause),
                  );
                  setSaving(false);
                });
            }}
          >
            {t({ en: "Not filled", zh: "未成交" })}
          </Button>
        </div>
        {error === null ? null : (
          <Callout intent="destructive">{error}</Callout>
        )}
      </div>
      <FillSheet
        order={order}
        isOpen={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
        }}
      />
    </Card>
  );
}
