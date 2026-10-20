import { describe, expect, it } from "vitest";
import { valuationChange } from "./valuation-change.ts";

describe("valuationChange", () => {
  it("gives the change", () => {
    expect(valuationChange(100_000, 103_100)).toEqual({
      changeMinor: 3_100,
      isLarge: false,
    });
  });

  it("flags a change of more than a quarter either way", () => {
    expect(valuationChange(52_600_000, 530_000_000).isLarge).toBe(true);
    expect(valuationChange(100_000, 70_000).isLarge).toBe(true);
    expect(valuationChange(100_000, 125_000).isLarge).toBe(false);
  });

  it("does not flag a change from zero", () => {
    expect(valuationChange(0, 5_000)).toEqual({
      changeMinor: 5_000,
      isLarge: false,
    });
  });
});
