"use client";

import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { useMediaQuery } from "#src/browser/use-media-query.ts";
import { t } from "#src/i18n.ts";
import type { ChartRange } from "./chart-ranges.ts";
import { visibleChartRanges } from "./visible-chart-ranges.ts";

const MD_QUERY = breakpoints.md.replace("@media ", "");

interface ChartRangeChipsProps {
  value: ChartRange;
  onChange: (range: ChartRange) => void;
}

/** Picks the date range of the time-series chart above it. */
export function ChartRangeChips({ value, onChange }: ChartRangeChipsProps) {
  const compact = !useMediaQuery(MD_QUERY, true);
  const labels: Record<ChartRange, string> = {
    "1M": t({ en: "1M", zh: "1 个月" }),
    "3M": t({ en: "3M", zh: "3 个月" }),
    "6M": t({ en: "6M", zh: "6 个月" }),
    YTD: t({ en: "YTD", zh: "今年" }),
    "1Y": t({ en: "1Y", zh: "1 年" }),
    "5Y": t({ en: "5Y", zh: "5 年" }),
    all: t({ en: "All", zh: "全部" }),
  };
  return (
    <SegmentedControl
      size="sm"
      fullWidth
      aria-label={t({ en: "Date range", zh: "时间范围" })}
      options={visibleChartRanges(value, compact).map((range) => ({
        value: range,
        label: labels[range],
      }))}
      value={value}
      onChange={onChange}
    />
  );
}
