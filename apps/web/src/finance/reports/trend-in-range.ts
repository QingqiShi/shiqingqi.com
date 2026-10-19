import { chartRangeStart } from "../charts/chart-range-start.ts";
import type { ChartRange } from "../charts/chart-ranges.ts";
import type {
  TrendPoint,
  WeeklyReportData,
} from "./weekly-report-data-schema.ts";

/** The points of a Report's weekly trend that fall in `range`, which ends with the Report's week. */
export function trendInRange(
  data: WeeklyReportData,
  range: ChartRange,
): TrendPoint[] {
  const start = chartRangeStart(
    range,
    data.periodEnd,
    data.trend.at(0)?.day ?? null,
  );
  return data.trend.filter((point) => point.day >= start);
}
