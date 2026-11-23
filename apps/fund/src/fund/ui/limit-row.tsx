"use client";

import { t } from "@tuja/i18n";
import { Badge } from "@tuja/ui/components/badge";
import { ListRow } from "@tuja/ui/components/list-row";
import type { RiskMetric } from "../contracts/risk-policy-schema.ts";
import { formatMetric } from "./format-metric.ts";

export interface LimitRowData {
  key: string;
  name: string;
  limit: string;
  metric: RiskMetric | null;
  measured: number | null;
  holds: boolean | null;
}

/** One limit: what it bounds, the bound, today's number and whether it holds. */
export function LimitRow({ row }: { row: LimitRowData }) {
  const today =
    row.metric === null || row.measured === null
      ? null
      : t({ en: "today {value}", zh: "今天 {value}" }).replace(
          "{value}",
          formatMetric(row.metric, row.measured),
        );
  return (
    <ListRow
      wrap
      value={row.limit}
      valueDetail={today}
      trailing={
        row.holds === null ? null : row.holds ? (
          <Badge size="sm" intent="success">
            {t({ en: "Holds", zh: "满足" })}
          </Badge>
        ) : (
          <Badge size="sm" intent="destructive">
            {t({ en: "Broken", zh: "已突破" })}
          </Badge>
        )
      }
    >
      {row.name}
    </ListRow>
  );
}
