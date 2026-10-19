"use client";

import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { t } from "#src/i18n.ts";
import { CHART_RANGES, type ChartRange } from "./chart-ranges.ts";

interface ChartRangeChipsProps {
  value: ChartRange;
  onChange: (range: ChartRange) => void;
}

/** Picks the date range of the time-series chart above it. */
export function ChartRangeChips({ value, onChange }: ChartRangeChipsProps) {
  const allLabel = t({ en: "All", zh: "全部" });
  return (
    <SegmentedControl
      size="sm"
      fullWidth
      aria-label={t({ en: "Date range", zh: "时间范围" })}
      options={CHART_RANGES.map((range) => ({
        value: range,
        label: range === "all" ? allLabel : range,
      }))}
      value={value}
      onChange={onChange}
    />
  );
}
