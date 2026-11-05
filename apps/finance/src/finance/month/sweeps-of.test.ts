import { describe, expect, it } from "vitest";
import { sweepsOf } from "./sweeps-of.ts";

const sum = (values: readonly number[]) =>
  values.reduce((total, value) => total + value, 0);

describe("sweepsOf", () => {
  it("keeps the proportions when every share is above the minimum", () => {
    expect(sweepsOf([3, 1], 0.1)).toEqual([0.75, 0.25]);
  });

  it("raises a small share to the minimum and takes the room from the rest", () => {
    const sweeps = sweepsOf([90, 9, 1, 0], 0.06);
    expect(sweeps[2]).toBeCloseTo(0.06);
    expect(sweeps[3]).toBe(0);
    expect(sweeps[0] / sweeps[1]).toBeCloseTo(10);
    expect(sum(sweeps)).toBeCloseTo(1);
  });

  it("raises a share that the first raise pushes below the minimum", () => {
    const sweeps = sweepsOf([100, 15, 1, 1, 1], 0.1);
    for (const sweep of sweeps.slice(1)) expect(sweep).toBeCloseTo(0.1);
    expect(sum(sweeps)).toBeCloseTo(1);
  });

  it("gives nothing to a ring with no value", () => {
    expect(sweepsOf([0, 0], 0.1)).toEqual([0, 0]);
  });
});
