/** The date ranges a time-series chart offers, shortest first. */
export const CHART_RANGES = [
  "1M",
  "3M",
  "6M",
  "YTD",
  "1Y",
  "5Y",
  "all",
] as const;

export type ChartRange = (typeof CHART_RANGES)[number];

export function isChartRange(value: string | null): value is ChartRange {
  return CHART_RANGES.some((range) => range === value);
}
