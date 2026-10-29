import { toEpochDay } from "../domain/dates/to-epoch-day.ts";
import { MAX_CHART_POINTS, sampleDays } from "./sample-days.ts";

/** The points a time-series chart draws: parallel arrays, ascending by day. */
export interface ChartSeries {
  /** Epoch days. */
  readonly days: Int32Array;
  readonly values: Float64Array;
}

interface BuildChartSeriesOptions {
  start: string;
  end: string;
  /** The value at the end of each epoch day, ascending. */
  valuesAt: (days: Int32Array) => Float64Array;
  maxPoints?: number;
}

/** Samples a range for a chart: at most `maxPoints` evenly spaced days and the value on each. */
export function buildChartSeries({
  start,
  end,
  valuesAt,
  maxPoints = MAX_CHART_POINTS,
}: BuildChartSeriesOptions): ChartSeries {
  const { days } = sampleDays(toEpochDay(start), toEpochDay(end), maxPoints);
  return { days, values: valuesAt(days) };
}
