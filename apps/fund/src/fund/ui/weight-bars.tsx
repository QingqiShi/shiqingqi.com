"use client";

import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { Progress } from "@tuja/ui/components/progress";
import { formatPercent } from "./format-percent.ts";

export interface WeightBar {
  key: string;
  label: string;
  weightPct: number;
  detail?: string;
}

/** Shares of the fund, each a row with its percentage and a bar of the same length. */
export function WeightBars({ items }: { items: readonly WeightBar[] }) {
  return (
    <List>
      {items.map((item) => (
        <ListRow
          key={item.key}
          wrap
          detail={item.detail}
          value={formatPercent(item.weightPct)}
          extra={
            <Progress
              value={item.weightPct}
              max={100}
              size="sm"
              label={item.label}
            />
          }
        >
          {item.label}
        </ListRow>
      ))}
    </List>
  );
}
