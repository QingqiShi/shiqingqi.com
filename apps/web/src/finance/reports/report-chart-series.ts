import type { ChartSeries } from "../charts/build-chart-series.ts";
import { toEpochDay } from "../domain/dates/to-epoch-day.ts";
import type { TrendPoint } from "./weekly-report-data-schema.ts";

/**
 * A Report's weekly trend as a chart series: net worth with its moving
 * average, or the property net alone (null when the Household has no
 * property Account).
 */
export function reportChartSeries(
  trend: readonly TrendPoint[],
  value: "netWorth" | "propertyNet",
): ChartSeries | null {
  if (value === "netWorth") {
    return {
      days: Int32Array.from(trend, (point) => toEpochDay(point.day)),
      values: Float64Array.from(trend, (point) => point.netWorthMinor),
      trend: Float64Array.from(trend, (point) => point.averageMinor),
    };
  }
  const points = trend.flatMap((point) =>
    point.propertyNetMinor === null
      ? []
      : [{ day: point.day, value: point.propertyNetMinor }],
  );
  if (points.length === 0) return null;
  return {
    days: Int32Array.from(points, (point) => toEpochDay(point.day)),
    values: Float64Array.from(points, (point) => point.value),
    trend: null,
  };
}
