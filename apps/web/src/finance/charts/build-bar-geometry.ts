import { barPath } from "./bar-path.ts";
import { linearScale } from "./linear-scale.ts";
import { niceTicks } from "./nice-ticks.ts";

export type BarLayout = "stacked" | "grouped";

interface BarGeometryInput {
  periodCount: number;
  series: readonly { values: ArrayLike<number> }[];
  layout: BarLayout;
  /** The plot's right edge; it starts at 0. */
  plotRight: number;
  top: number;
  bottom: number;
  /** At most this many gridlines. */
  tickCount: number;
  /** Values that must fit inside the domain too, such as a reference line. */
  alsoShow?: readonly number[];
  /** 1 for a period to draw apart, such as one the range cuts short. */
  partial?: ArrayLike<number>;
}

/** Where one series' bars are, in pixels; `NaN` where a period has no bar. */
interface BarSpans {
  x: Float64Array;
  /** The side nearest the baseline. */
  yBase: Float64Array;
  /** The data end. */
  yEnd: Float64Array;
}

interface BarGeometry {
  /** The width of one period's slot. */
  band: number;
  barWidth: number;
  /** One path per series holding every bar of it, except the partial periods'. */
  paths: string[];
  /** One path per series holding its bars in partial periods. */
  partialPaths: string[];
  spans: BarSpans[];
  y: (value: number) => number;
  yTicks: { value: number; y: number }[];
  tickStep: number;
  zeroY: number;
}

const MAX_BAR = 24;
const RADIUS = 4;
const GAP = 2;

function domainOf(input: BarGeometryInput) {
  let low = 0;
  let high = 0;
  const { periodCount, series, layout } = input;
  if (layout === "stacked") {
    for (let period = 0; period < periodCount; period++) {
      let up = 0;
      let down = 0;
      for (const { values } of series) {
        const value = values[period];
        if (value > 0) up += value;
        else if (value < 0) down += value;
      }
      if (up > high) high = up;
      if (down < low) low = down;
    }
  } else {
    for (const { values } of series) {
      for (let period = 0; period < periodCount; period++) {
        const value = values[period];
        if (value > high) high = value;
        if (value < low) low = value;
      }
    }
  }
  for (const value of input.alsoShow ?? []) {
    if (value > high) high = value;
    if (value < low) low = value;
  }
  if (low === 0 && high === 0) high = 100;
  return [low, high];
}

function niceDomain(low: number, high: number, count: number) {
  const rough = niceTicks(low, high, count);
  const step = rough.length > 1 ? rough[1] - rough[0] : Math.max(high - low, 1);
  const top = high > 0 ? Math.ceil(high / step) * step : 0;
  const bottom = low < 0 ? Math.floor(low / step) * step : 0;
  const ticks: number[] = [];
  for (let tick = bottom; tick <= top + step / 2; tick += step) {
    ticks.push(Math.round(tick) || 0);
  }
  return { bottom, top, step, ticks };
}

/**
 * The geometry of a bar chart: a slot per period, bars at most 24px wide,
 * a 2px gap between stacked segments and grouped bars, 4px round corners
 * on each bar's data end. A stack grows up from zero for positive values
 * and down for negative ones. When the slots get too narrow for a gap, the
 * bars touch and lose their corners.
 */
export function buildBarGeometry(input: BarGeometryInput): BarGeometry {
  const { periodCount, series, layout, plotRight, top, bottom } = input;
  const [low, high] = domainOf(input);
  const nice = niceDomain(low, high, input.tickCount);
  const y = linearScale(nice.bottom, nice.top, bottom, top);
  const zeroY = y(0);
  const band = periodCount > 0 ? plotRight / periodCount : 0;
  const dense = band < 4;
  const seriesCount = Math.max(series.length, 1);

  let barWidth: number;
  let groupWidth: number;
  if (layout === "stacked") {
    barWidth = dense ? band : Math.min(MAX_BAR, band * 0.7);
    groupWidth = barWidth;
  } else {
    const gaps = dense ? 0 : GAP * (seriesCount - 1);
    groupWidth = dense
      ? band
      : Math.min(band * 0.8, MAX_BAR * seriesCount + gaps);
    barWidth = Math.max((groupWidth - gaps) / seriesCount, 0);
  }
  const radius = barWidth >= 6 ? RADIUS : 0;
  const gap = barWidth >= 3 ? GAP : 0;

  const spans: BarSpans[] = series.map(() => ({
    x: new Float64Array(periodCount).fill(Number.NaN),
    yBase: new Float64Array(periodCount).fill(Number.NaN),
    yEnd: new Float64Array(periodCount).fill(Number.NaN),
  }));
  const parts: string[][] = series.map(() => []);
  const partialParts: string[][] = series.map(() => []);

  for (let period = 0; period < periodCount; period++) {
    const slot = period * band + (band - groupWidth) / 2;
    const target = input.partial?.[period] ? partialParts : parts;
    if (layout === "stacked") {
      let lastUp = -1;
      let lastDown = -1;
      series.forEach(({ values }, index) => {
        if (values[period] > 0) lastUp = index;
        else if (values[period] < 0) lastDown = index;
      });
      let up = 0;
      let down = 0;
      series.forEach(({ values }, index) => {
        const value = values[period];
        if (!value) return;
        const from = value > 0 ? up : down;
        const to = from + value;
        if (value > 0) up = to;
        else down = to;
        let yBase = y(from);
        const yEnd = y(to);
        if (from !== 0 && Math.abs(yEnd - yBase) > gap) {
          yBase += value > 0 ? -gap : gap;
        }
        const outer = index === (value > 0 ? lastUp : lastDown);
        spans[index].x[period] = slot;
        spans[index].yBase[period] = yBase;
        spans[index].yEnd[period] = yEnd;
        target[index].push(
          barPath(slot, yBase, yEnd, barWidth, outer ? radius : 0),
        );
      });
    } else {
      series.forEach(({ values }, index) => {
        const value = values[period];
        if (!value) return;
        const x = slot + index * (barWidth + (dense ? 0 : GAP));
        const yEnd = y(value);
        spans[index].x[period] = x;
        spans[index].yBase[period] = zeroY;
        spans[index].yEnd[period] = yEnd;
        target[index].push(barPath(x, zeroY, yEnd, barWidth, radius));
      });
    }
  }

  return {
    band,
    barWidth,
    paths: parts.map((pieces) => pieces.join("")),
    partialPaths: partialParts.map((pieces) => pieces.join("")),
    spans,
    y,
    yTicks: nice.ticks.map((value) => ({ value, y: y(value) })),
    tickStep: nice.step,
    zeroY,
  };
}
