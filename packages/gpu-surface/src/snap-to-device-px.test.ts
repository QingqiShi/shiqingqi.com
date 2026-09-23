import { describe, expect, it } from "vitest";
import { snapToDevicePx } from "./snap-to-device-px.ts";

describe("snapToDevicePx", () => {
  it("rounds to whole CSS pixels at an integer scale", () => {
    expect(snapToDevicePx(100.4, 2)).toBe(100);
    expect(snapToDevicePx(100.6, 3)).toBe(101);
    expect(snapToDevicePx(100.5, 1)).toBe(101);
  });

  it("rounds to whole device pixels at a fractional scale", () => {
    const snapped = snapToDevicePx(100.4, 1.5);

    expect(snapped * 1.5).toBeCloseTo(151);
  });

  it("keeps a value already on a device pixel", () => {
    expect(snapToDevicePx(0, 2.625)).toBe(0);
    expect(snapToDevicePx(8, 2.625) * 2.625).toBeCloseTo(21);
  });
});
