"use client";

import { t } from "@tuja/i18n";
import { List } from "@tuja/ui/components/list";
import type { LimitCheck, LimitName } from "../risk/check-risk-policy.ts";
import { formatMetric } from "./format-metric.ts";
import { LimitRow } from "./limit-row.tsx";

/** The limits of the risk policy, each with the number measured today. */
export function PolicyLimitList({ limits }: { limits: readonly LimitCheck[] }) {
  const names: Record<LimitName, string> = {
    maxPositionWeightPct: t({ en: "One stock", zh: "单只股票占比" }),
    maxSectorWeightPct: t({ en: "One sector", zh: "单一行业占比" }),
    minCashWeightPct: t({ en: "Cash", zh: "现金占比" }),
    maxUsdWeightPct: t({ en: "In US dollars", zh: "美元资产占比" }),
    maxPositions: t({ en: "Positions", zh: "持仓数" }),
  };
  const atMost = t({ en: "at most {n}", zh: "不超过 {n}" });
  const atLeast = t({ en: "at least {n}", zh: "不低于 {n}" });
  return (
    <List>
      {limits.map((limit) => (
        <LimitRow
          key={limit.limit}
          row={{
            key: limit.limit,
            name: names[limit.limit],
            limit: (limit.bound === "max" ? atMost : atLeast).replace(
              "{n}",
              formatMetric(limit.metric, limit.value),
            ),
            metric: limit.metric,
            measured: limit.measured,
            holds: limit.holds,
          }}
        />
      ))}
    </List>
  );
}
