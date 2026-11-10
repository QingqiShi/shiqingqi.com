import { describe, expect, it } from "vitest";
import { snapToStep, tickStride } from "./snap-to-step.ts";

describe("snapToStep", () => {
  it("rounds to the nearest step from min, without float noise", () => {
    expect(snapToStep(1.37, { min: 1, max: 9, step: 0.25 })).toBe(1.25);
    expect(snapToStep(0.3, { min: 0, max: 1, step: 0.1 })).toBe(0.3);
    expect(snapToStep(512, { min: 500, max: 6000, step: 50 })).toBe(500);
  });

  it("keeps the value inside the range, also when the range is not a whole number of steps", () => {
    expect(snapToStep(-5, { min: 0, max: 100, step: 5 })).toBe(0);
    expect(snapToStep(10, { min: 0, max: 10, step: 3 })).toBe(9);
  });
});

describe("tickStride", () => {
  it("takes the smallest 1, 2 or 5 stride that keeps ticks apart", () => {
    expect(tickStride({ min: 0, max: 10, step: 1 }, 200, 12)).toBe(1);
    expect(tickStride({ min: 0, max: 100, step: 1 }, 300, 12)).toBe(5);
  });

  it("draws no ticks for a range of fewer than two steps", () => {
    expect(tickStride({ min: 0, max: 1, step: 1 }, 300, 12)).toBeNull();
  });
});
