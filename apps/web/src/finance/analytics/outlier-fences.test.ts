import { expect, test } from "vitest";
import { outlierFences } from "./outlier-fences.ts";

test("keeps values within 1.5 IQR of the quartiles", () => {
  const fences = outlierFences([10, 12, 11, 13, 12, 11, 400, 10, 12]);
  expect(fences).not.toBeNull();
  if (!fences) return;
  // Q1 = 11, Q3 = 12, IQR = 1: keep 9.5 to 13.5.
  expect(fences.low).toBeCloseTo(9.5);
  expect(fences.high).toBeCloseTo(13.5);
  expect(400 > fences.high).toBe(true);
});

test("needs four values to judge", () => {
  expect(outlierFences([1, 2, 300])).toBeNull();
  expect(outlierFences([5, 5, 5, 5])).toEqual({ low: 5, high: 5 });
});

test("agrees with quartiles from a full sort", () => {
  let seed = 3;
  const random = () => {
    seed = (seed * 16_807) % 2_147_483_647;
    return seed / 2_147_483_647;
  };
  for (const size of [4, 5, 7, 10, 101, 1000]) {
    const values = Float64Array.from({ length: size }, () =>
      Math.round(random() * 500),
    );
    const sorted = values.slice().sort();
    const quantile = (q: number) => {
      const position = (sorted.length - 1) * q;
      const below = Math.floor(position);
      const above = Math.min(below + 1, sorted.length - 1);
      return (
        sorted[below] + (sorted[above] - sorted[below]) * (position - below)
      );
    };
    const spread = (quantile(0.75) - quantile(0.25)) * 1.5;
    const fences = outlierFences(values);
    expect(fences?.low).toBeCloseTo(quantile(0.25) - spread, 9);
    expect(fences?.high).toBeCloseTo(quantile(0.75) + spread, 9);
  }
});
