import { toEpochDay } from "../domain/dates/to-epoch-day.ts";
import { MAX_CHART_POINTS, sampleDays } from "./sample-days.ts";
import { trailingAverage } from "./trailing-average.ts";

/** The points a time-series chart draws: parallel arrays, ascending by day. */
export interface ChartSeries {
  /** Epoch days. */
  readonly days: Int32Array;
  readonly values: Float64Array;
  /** The trailing average at each point, or null without a trend line. */
  readonly trend: Float64Array | null;
}

interface BuildChartSeriesOptions {
  start: string;
  end: string;
  /** The first day with data, or null; a trend line reads no further back. */
  firstDay: string | null;
  /** The value at the end of each epoch day, ascending. */
  valuesAt: (days: Int32Array) => Float64Array;
  /** The trend line's window, such as 91 for a 13-week average; omit for none. */
  trendWindowDays?: number;
  maxPoints?: number;
}

/**
 * Samples a range for a chart: at most `maxPoints` evenly spaced days, the
 * value on each, and the trend line. The trend at the first point reads
 * days before the range, so it does not start flat.
 */
export function buildChartSeries({
  start,
  end,
  firstDay,
  valuesAt,
  trendWindowDays,
  maxPoints = MAX_CHART_POINTS,
}: BuildChartSeriesOptions): ChartSeries {
  const startDay = toEpochDay(start);
  const history =
    firstDay === null ? 0 : Math.max(startDay - toEpochDay(firstDay), 0);
  const leadIn =
    trendWindowDays === undefined ? 0 : Math.min(trendWindowDays, history);
  const sampled = sampleDays(startDay, toEpochDay(end), maxPoints, leadIn);
  const all = valuesAt(sampled.days);
  const from = sampled.firstVisible;
  const days = sampled.days.subarray(from);
  const values = all.subarray(from);
  if (trendWindowDays === undefined) return { days, values, trend: null };
  const trend = trailingAverage(sampled.days, all, trendWindowDays).subarray(
    from,
  );
  return { days, values, trend };
}
