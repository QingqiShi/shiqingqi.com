"use client";

import { t } from "@tuja/i18n";
import { List } from "@tuja/ui/components/list";
import type { GuardrailCheck, GuardrailKey } from "../risk/check-guardrails.ts";
import { formatMoney } from "./format-money.ts";
import { LimitRow } from "./limit-row.tsx";

function useGuardrailWords(): Record<
  GuardrailKey,
  { name: string; limit: (n: number) => string }
> {
  const atMost = t({ en: "at most {n}", zh: "不超过 {n}" });
  const days = t({ en: "{n} days", zh: "{n} 天" });
  const within = t({ en: "within {n}", zh: "不超过 {n}" });
  const sessions = t({ en: "at most {n} sessions", zh: "最多 {n} 个交易日" });
  return {
    position: {
      name: t({ en: "One stock, right after a buy", zh: "买入后单只股票占比" }),
      limit: (n) => atMost.replace("{n}", `${String(n)}%`),
    },
    sector: {
      name: t({ en: "One sector", zh: "单一行业占比" }),
      limit: (n) => atMost.replace("{n}", `${String(n)}%`),
    },
    hold: {
      name: t({
        en: "Each lot is held before it can be sold",
        zh: "每批股票卖出前须持有",
      }),
      limit: (n) => days.replace("{n}", String(n)),
    },
    distance: {
      name: t({
        en: "A limit price from the last close",
        zh: "限价与最近收盘价的距离",
      }),
      limit: (n) => within.replace("{n}", `${String(n)}%`),
    },
    sessions: {
      name: t({ en: "An order lives for", zh: "订单有效期" }),
      limit: (n) => sessions.replace("{n}", String(n)),
    },
    size: {
      name: t({ en: "The smallest order", zh: "最小订单金额" }),
      limit: (n) => formatMoney(n, { whole: true }),
    },
  };
}

/** The owner's guardrails, which no agent can loosen, measured where a number exists. */
export function GuardrailList({
  checks,
}: {
  checks: readonly GuardrailCheck[];
}) {
  const words = useGuardrailWords();
  return (
    <List>
      {checks.map((check) => (
        <LimitRow
          key={check.key}
          row={{
            key: check.key,
            name: words[check.key].name,
            limit: words[check.key].limit(check.limit),
            metric: check.metric,
            measured: check.measured,
            holds: check.holds,
          }}
        />
      ))}
    </List>
  );
}
