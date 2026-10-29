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
