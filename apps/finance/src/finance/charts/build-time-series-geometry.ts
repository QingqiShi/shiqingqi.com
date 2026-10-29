import { scaleLinear, type ScaleLinear } from "d3-scale";
import { area, curveMonotoneX, line } from "d3-shape";
import type { ChartSeries } from "./build-chart-series.ts";
import { chartDomain } from "./chart-domain.ts";
import { dateTicks, type DateTick } from "./date-ticks.ts";
import { summariseSeries } from "./summarise-series.ts";

interface TimeSeriesGeometryInput {
  series: ChartSeries;
  /** A second line to draw and fit inside the domain, such as a moving average. */
  trend: Float64Array | null;
  /** The first day sits at 0 and the last at `width`, in pixels. */
  width: number;
  top: number;
  bottom: number;
  /** About this many gridlines. */
  tickCount: number;
  /** The least space between two date labels, in pixels. */
  dateSpacing: number;
}

/** A stop of the area's gradient: `offset` 0 is at `y1`, 1 at `y2`. */
interface GradientStop {
  offset: number;
  /** From 0, transparent, to 1, the deepest the area gets. */
  strength: number;
}

/**
 * A vertical gradient in plot pixels that is transparent at zero and deepest
 * at the point furthest from it, above or below. When zero is off the plot,
 * the edge nearest it stands in for it.
 */
interface AreaGradient {
  y1: number;
  y2: number;
  stops: GradientStop[];
}

export interface TimeSeriesGeometry {
  y: ScaleLinear<number, number>;
  /** Each point's position, in pixels. */
  xs: Float64Array;
  ys: Float64Array;
  trendYs: Float64Array | null;
  line: string;
  area: string;
  trendLine: string;
  gradient: AreaGradient;
  yTicks: { value: number; y: number }[];
  /** The zero line's position, or null when zero is not inside the domain. */
  zeroY: number | null;
  xTicks: (DateTick & { x: number })[];
  summary: ReturnType<typeof summariseSeries>;
}

const DIGITS = 1;

function curveThrough(xs: Float64Array, ys: Float64Array) {
  return line<number>()
    .x((index) => xs[index])
    .y((index) => ys[index])
    .curve(curveMonotoneX)
    .digits(DIGITS);
}

function areaGradient(
  low: number,
  high: number,
  y: (value: number) => number,
  top: number,
  bottom: number,
): AreaGradient {
  const zeroY = Math.min(Math.max(y(0), top), bottom);
  const reach = Math.max(Math.abs(low), Math.abs(high));
  const crosses = low < 0 && high > 0;
  const y1 = high > 0 ? Math.min(y(high), zeroY) : zeroY;
  const y2 = low < 0 ? Math.max(y(low), zeroY) : zeroY;
  const span = y2 - y1;
  const zeroOffset = span > 0 ? (zeroY - y1) / span : 0;
  const strengthOf = (value: number) =>
    crosses && reach > 0 ? Math.abs(value) / reach : 1;
  return {
    y1,
    y2,
    stops: [
      { offset: 0, strength: high > 0 ? strengthOf(high) : 0 },
      { offset: zeroOffset, strength: 0 },
      { offset: 1, strength: low < 0 ? strengthOf(low) : 0 },
    ],
  };
}

/**
 * The geometry of a time-series chart: linear scales over epoch days and
 * values, a monotone curve through the points so the curve never passes the
 * highest or lowest point, an area closed to zero (or to the plot edge
 * nearest it), round gridlines and calendar ticks.
 */
export function buildTimeSeriesGeometry({
  series,
  trend,
  width,
  top,
  bottom,
  tickCount,
  dateSpacing,
}: TimeSeriesGeometryInput): TimeSeriesGeometry {
  const { days, values } = series;
  const [low, high] = chartDomain(values, trend);
  const first = days.length > 0 ? days[0] : 0;
  const last = days.length > 0 ? days[days.length - 1] : 0;
  const x = scaleLinear().domain([first, last]).range([0, width]);
  const y = scaleLinear().domain([low, high]).range([bottom, top]);
  const xs = Float64Array.from(days, (day) => x(day));
  const ys = Float64Array.from(values, (value) => y(value));
  const trendYs = trend ? Float64Array.from(trend, (value) => y(value)) : null;
  const baseline = Math.min(Math.max(y(0), top), bottom);
  const summary = summariseSeries(values);
  const indices = Array.from(xs.keys());
  const fill = area<number>()
    .x((index) => xs[index])
    .y0(baseline)
    .y1((index) => ys[index])
    .curve(curveMonotoneX)
    .digits(DIGITS);
  return {
    y,
    xs,
    ys,
    trendYs,
    line: curveThrough(xs, ys)(indices) ?? "",
    area: fill(indices) ?? "",
    trendLine: trendYs ? (curveThrough(xs, trendYs)(indices) ?? "") : "",
    gradient: areaGradient(summary.min, summary.max, y, top, bottom),
    yTicks: y.ticks(tickCount).map((value) => ({ value, y: y(value) })),
    zeroY: low < 0 && high > 0 ? y(0) : null,
    xTicks: dateTicks(first, last, Math.floor(width / dateSpacing)).map(
      (tick) => ({ ...tick, x: x(tick.epochDay) }),
    ),
    summary,
  };
}
