"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { color } from "@tuja/ui/color.stylex";
import { Badge } from "@tuja/ui/components/badge";
import { Card } from "@tuja/ui/components/card";
import { Disclosure } from "@tuja/ui/components/disclosure";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
import type { TicketView } from "../views/load-desk.ts";
import { displayDate } from "./display-date.ts";
import { formatMoney } from "./format-money.ts";
import { MarkdownText } from "./markdown-text.tsx";
import { SideBadge } from "./side-badge.tsx";

const styles = stylex.create({
  terms: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 7.5rem), 1fr))",
    gap: rhythm.item,
    margin: 0,
  },
  term: {
    margin: 0,
    color: color.mutedForeground,
  },
  value: {
    margin: 0,
  },
  headline: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: rhythm.tight,
  },
});

function Term({ label, value }: { label: string; value: string }) {
  return (
    <div css={stack.text}>
      <dt css={[typeRole.caption, styles.term]}>{label}</dt>
      <dd css={[typeRole.body, typeModifier.numeric, styles.value]}>{value}</dd>
    </div>
  );
}

/**
 * One order for the owner to place with the broker: side, shares, symbol,
 * limit and last day, what happens if it does not fill, and why, one tap
 * away.
 */
export function OrderTicket({ ticket }: { ticket: TicketView }) {
  const locale = useLocale();
  const expiry: Record<TicketView["onExpiry"], string> = {
    cancel: t({ en: "Let it lapse", zh: "到期作废" }),
    reprice: t({ en: "Reprice", zh: "调整限价" }),
    reassess: t({ en: "Think again", zh: "重新评估" }),
  };
  const status: Record<TicketView["status"], string | null> = {
    open: null,
    filled: t({ en: "Filled", zh: "已成交" }),
    expired: t({ en: "Lapsed", zh: "已过期" }),
    cancelled: t({ en: "Cancelled", zh: "已撤销" }),
  };
  const statusText = status[ticket.status];
  return (
    <Card>
      <div css={stack.item}>
        <div css={styles.headline}>
          <div css={stack.text}>
            <Text as="p" look="body" weight="semibold" numeric>
              {`${ticket.quantity.toLocaleString("en-GB")} × ${ticket.symbol}`}
            </Text>
            <Text as="p" look="caption" tone="muted" measure="none">
              {ticket.name}
            </Text>
          </div>
          <span>
            {statusText === null ? (
              <SideBadge side={ticket.side} />
            ) : (
              <Badge intent="neutral">{statusText}</Badge>
            )}
          </span>
        </div>
        <dl css={styles.terms}>
          <Term
            label={t({ en: "Limit price", zh: "限价" })}
            value={ticket.limitText}
          />
          <Term
            label={t({ en: "Good through", zh: "有效至" })}
            value={displayDate(ticket.validUntil, locale, "weekday")}
          />
          <Term
            label={t({ en: "About", zh: "约合" })}
            value={formatMoney(ticket.valueGbp, { whole: true })}
          />
          <Term
            label={t({ en: "If it does not fill", zh: "若未成交" })}
            value={
              ticket.onExpiry === "reprice" && ticket.repriceLimitText !== null
                ? `${expiry.reprice} · ${ticket.repriceLimitText}`
                : expiry[ticket.onExpiry]
            }
          />
        </dl>
        <Text as="p" look="bodySmall" tone="muted" measure="none" verbatim>
          {ticket.unfilledPlan}
        </Text>
        <Disclosure summary={t({ en: "Why this order", zh: "为什么下这笔单" })}>
          <MarkdownText>{ticket.rationale}</MarkdownText>
        </Disclosure>
      </div>
    </Card>
  );
}
