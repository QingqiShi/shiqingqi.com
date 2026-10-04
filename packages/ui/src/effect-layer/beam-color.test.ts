import { describe, expect, it } from "vitest";
import { beamColor } from "./beam-color.ts";

describe("beamColor", () => {
  const accent = [0.55, 0.2, 0.85, 1] as const;

  it("brightens a fill on a dark page until its strongest channel is full", () => {
    const [red, green, blue] = beamColor(accent, true);
    expect(blue).toBeCloseTo(1, 9);
    expect(red / blue).toBeGreaterThan(0.55 / 0.85);
    expect(green).toBeLessThan(red);
  });

  it("turns a dark fill into pale light on a dark page", () => {
    const [red, green, blue] = beamColor([0.1, 0.1, 0.12, 1], true);
    expect(Math.min(red, green, blue)).toBeGreaterThan(0.6);
  });

  it("keeps a deep fill and darkens a pale one on a light page", () => {
    expect(beamColor(accent, false)).toEqual([0.55, 0.2, 0.85]);
    const [red, green, blue] = beamColor([1, 0.85, 0.4, 1], false);
    expect(red).toBeLessThan(1);
    expect(red).toBeGreaterThan(green);
    expect(green).toBeGreaterThan(blue);
  });

  it("casts neutral light from a transparent fill", () => {
    expect(beamColor([0, 0, 0, 0], true)).toEqual([1, 0.97, 0.92]);
    expect(beamColor([0, 0, 0, 0], false)).toEqual([0.32, 0.33, 0.36]);
  });
});
