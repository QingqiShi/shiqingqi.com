import { expect, test } from "vitest";
import { buildTimeSeriesGeometry } from "./build-time-series-geometry.ts";

const base = {
  width: 300,
  top: 0,
  bottom: 100,
  tickCount: 4,
  dateSpacing: 76,
  trend: null,
};

function geometryOf(values: number[]) {
  return buildTimeSeriesGeometry({
    ...base,
    series: {
      days: Int32Array.from(values, (_, index) => 20_000 + index),
      values: Float64Array.from(values),
    },
  });
}

test("puts the first day at the left edge and the last day at the right edge", () => {
  const geometry = geometryOf([10, 40, 20, 30]);
  expect(geometry.xs.at(0)).toBe(0);
  expect(geometry.xs.at(-1)).toBe(base.width);
  expect(geometry.line).toMatch(/^M0,/);
  expect(geometry.area).toMatch(/^M0,/);
  const areaXs = [...geometry.area.matchAll(/(-?[\d.]+),-?[\d.]+/g)].map(
    (match) => Number(match[1]),
  );
  expect(Math.min(...areaXs)).toBe(0);
  expect(Math.max(...areaXs)).toBe(base.width);
});

test("fades the area to the plot edge nearest zero when zero is off the plot", () => {
  const above = geometryOf([400, 450, 420]);
  expect(above.zeroY).toBeNull();
  expect(above.gradient.y1).toBeCloseTo(above.y(450));
  expect(above.gradient.y2).toBe(base.bottom);
  expect(above.gradient.stops.at(0)?.strength).toBe(1);
  expect(above.gradient.stops.at(-1)?.strength).toBe(0);

  const below = geometryOf([-400, -450, -420]);
  expect(below.gradient.y1).toBe(base.top);
  expect(below.gradient.y2).toBeCloseTo(below.y(-450));
  expect(below.gradient.stops.at(0)?.strength).toBe(0);
  expect(below.gradient.stops.at(-1)?.strength).toBe(1);
});

test("fades the area to zero from both sides, deepest at the furthest point", () => {
  const geometry = geometryOf([-50, 100, 20]);
  const { y1, y2, stops } = geometry.gradient;
  expect(geometry.zeroY).not.toBeNull();
  expect(y1).toBeCloseTo(geometry.y(100));
  expect(y2).toBeCloseTo(geometry.y(-50));
  expect(y1 + stops[1].offset * (y2 - y1)).toBeCloseTo(geometry.zeroY ?? 0);
  expect(stops.map((stop) => stop.strength)).toEqual([1, 0, 0.5]);
});

test("curves through every point without passing the extremes", () => {
  const geometry = geometryOf([0, 100, 100, 0, 50]);
  expect(geometry.line).toContain("C");
  const ys = [...geometry.line.matchAll(/[\d.]+,([\d.]+)/g)].map((match) =>
    Number(match[1]),
  );
  expect(Math.min(...ys)).toBeGreaterThanOrEqual(geometry.y(100) - 0.1);
  expect(Math.max(...ys)).toBeLessThanOrEqual(geometry.y(0) + 0.1);
});

test("draws a trend line only when one is given", () => {
  expect(geometryOf([1, 2, 3]).trendLine).toBe("");
  const withTrend = buildTimeSeriesGeometry({
    ...base,
    series: { days: Int32Array.of(0, 7, 14), values: Float64Array.of(1, 2, 3) },
    trend: Float64Array.of(1, 1.5, 2),
  });
  expect(withTrend.trendLine).not.toBe("");
  expect(withTrend.trendYs?.length).toBe(3);
});
