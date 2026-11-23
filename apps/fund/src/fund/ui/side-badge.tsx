"use client";

import { t } from "@tuja/i18n";
import { Badge } from "@tuja/ui/components/badge";

/** Buy or sell, as a badge. */
export function SideBadge({ side }: { side: "buy" | "sell" }) {
  return side === "buy" ? (
    <Badge intent="primary">{t({ en: "Buy", zh: "买入" })}</Badge>
  ) : (
    <Badge intent="warning">{t({ en: "Sell", zh: "卖出" })}</Badge>
  );
}
