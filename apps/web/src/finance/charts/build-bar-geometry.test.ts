import { expect, test } from "vitest";
import { barPath } from "./bar-path.ts";
import { buildBarGeometry } from "./build-bar-geometry.ts";

const base = { plotRight: 300, top: 0, bottom: 100, tickCount: 4 };

test("stacks positive values up and negative values down from zero", () => {
  const geometry = buildBarGeometry({
    ...base,
    periodCount: 3,
    layout: "stacked",
    series: [
      { values: Float64Array.of(100, -50, 0) },
      { values: Float64Array.of(50, 100, 0) },
    ],
  });
  const zero = geometry.zeroY;
  const [first, second] = geometry.spans;
  expect(first.yBase[0]).toBeCloseTo(zero);
  expect(first.yEnd[0]).toBeLessThan(zero);
  expect(second.yBase[0]).toBeCloseTo(first.yEnd[0] - 2);
  expect(first.yEnd[1]).toBeGreaterThan(zero);
  expect(second.yBase[1]).toBeCloseTo(zero);
  expect(Number.isNaN(first.x[2])).toBe(true);
  expect(geometry.yTicks.at(0)?.value).toBeLessThanOrEqual(-50);
  expect(geometry.yTicks.at(-1)?.value).toBeGreaterThanOrEqual(150);
  expect(geometry.barWidth).toBeLessThanOrEqual(24);
});

test("puts grouped bars side by side and drops corners when slots are narrow", () => {
  const grouped = buildBarGeometry({
    ...base,
    periodCount: 2,
    layout: "grouped",
    series: [
      { values: Float64Array.of(10, 20) },
      { values: Float64Array.of(5, 5) },
    ],
  });
  expect(grouped.spans[1].x[0]).toBeCloseTo(
    grouped.spans[0].x[0] + grouped.barWidth + 2,
  );
  const dense = buildBarGeometry({
    ...base,
    periodCount: 600,
    layout: "stacked",
    series: [{ values: new Float64Array(600).fill(1) }],
  });
  expect(dense.barWidth).toBeCloseTo(0.5);
  expect(dense.paths[0]).not.toContain("Q");
});

test("rounds only the data end of a bar", () => {
  expect(barPath(0, 100, 20, 10, 4)).toBe(
    "M0,100V24Q0,20 4,20H6Q10,20 10,24V100Z",
  );
  expect(barPath(0, 50, 80, 10, 4)).toBe(
    "M0,50V76Q0,80 4,80H6Q10,80 10,76V50Z",
  );
  expect(barPath(0, 50, 50, 10, 4)).toBe("");
});

test("draws the bars of partial periods in their own paths", () => {
  const geometry = buildBarGeometry({
    ...base,
    periodCount: 3,
    layout: "stacked",
    series: [{ values: Float64Array.of(100, 80, 20) }],
    partial: Uint8Array.of(0, 0, 1),
  });
  const whole = buildBarGeometry({
    ...base,
    periodCount: 2,
    plotRight: 200,
    layout: "stacked",
    series: [{ values: Float64Array.of(100, 80) }],
  });
  expect(geometry.partialPaths[0]).not.toBe("");
  expect(geometry.paths[0]).not.toContain(geometry.partialPaths[0]);
  expect(geometry.paths[0].length).toBeGreaterThan(0);
  expect(whole.partialPaths[0]).toBe("");
});
