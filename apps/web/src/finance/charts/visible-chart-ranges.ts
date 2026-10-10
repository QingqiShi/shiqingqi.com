import { CHART_RANGES, type ChartRange } from "./chart-ranges.ts";

const COMPACT_RANGES: ReadonlySet<ChartRange> = new Set([
  "1M",
  "6M",
  "YTD",
  "1Y",
  "all",
]);

/**
 * The range chips a chart shows. A phone has room for five, so it drops 3M
 * and 5Y unless one of them is the picked range.
 */
export function visibleChartRanges(
  value: ChartRange,
  compact: boolean,
): ChartRange[] {
  if (!compact) return [...CHART_RANGES];
  return CHART_RANGES.filter(
    (range) => COMPACT_RANGES.has(range) || range === value,
  );
}
