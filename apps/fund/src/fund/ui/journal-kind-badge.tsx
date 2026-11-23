"use client";

import { t } from "@tuja/i18n";
import { Badge } from "@tuja/ui/components/badge";
import type { JournalEntry } from "../types.ts";

/** What kind of journal entry this is, as a badge. */
export function JournalKindBadge({ kind }: { kind: JournalEntry["kind"] }) {
  switch (kind) {
    case "buy":
      return <Badge intent="primary">{t({ en: "Buy", zh: "买入" })}</Badge>;
    case "sell":
      return <Badge intent="warning">{t({ en: "Sell", zh: "卖出" })}</Badge>;
    case "hold":
      return <Badge intent="neutral">{t({ en: "Hold", zh: "持有" })}</Badge>;
    case "no_action":
      return (
        <Badge intent="neutral">{t({ en: "No action", zh: "不操作" })}</Badge>
      );
    case "cancel_order":
      return (
        <Badge intent="warning">
          {t({ en: "Order cancelled", zh: "撤单" })}
        </Badge>
      );
    case "rejected":
      return (
        <Badge intent="destructive">
          {t({ en: "Rejected", zh: "被否决" })}
        </Badge>
      );
    case "filled":
      return (
        <Badge intent="success">{t({ en: "Filled", zh: "已成交" })}</Badge>
      );
    case "not_filled":
      return (
        <Badge intent="neutral">{t({ en: "Not filled", zh: "未成交" })}</Badge>
      );
    case "expired":
      return (
        <Badge intent="neutral">{t({ en: "Expired", zh: "已过期" })}</Badge>
      );
    case "fund_thesis":
      return (
        <Badge intent="info">{t({ en: "Fund thesis", zh: "投资逻辑" })}</Badge>
      );
    case "risk_policy":
      return (
        <Badge intent="info">{t({ en: "Risk policy", zh: "风险政策" })}</Badge>
      );
  }
}
