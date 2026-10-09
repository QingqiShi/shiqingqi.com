import { describe, expect, it } from "vitest";
import { lampPalette } from "./lamp-palette.ts";

describe("lampPalette", () => {
  const accent = [0.3, 0.35, 0.9, 1] as const;

  it("brightens the glow and whitens the core on a dark page", () => {
    const { core, glow } = lampPalette(accent, true);
    expect(Math.max(...glow)).toBeCloseTo(1, 9);
    expect(glow[2]).toBeGreaterThan(glow[0]);
    expect(Math.min(...core)).toBeGreaterThan(Math.min(...glow));
    expect(core[0]).toBeGreaterThan(glow[0]);
  });

  it("keeps the fill at the core and warms the glow on a light page", () => {
    const { core, glow } = lampPalette(accent, false);
    expect(core).toEqual([0.3, 0.35, 0.9]);
    expect(glow[0]).toBeGreaterThan(core[0]);
    expect(glow[2]).toBeLessThan(core[2]);
  });

  it("casts neutral light from a transparent fill", () => {
    const dark = lampPalette([0, 0, 0, 0], true);
    const light = lampPalette([0, 0, 0, 0], false);
    expect(dark.glow).toEqual([1, 0.97, 0.92]);
    expect(light.core).toEqual([0.32, 0.33, 0.36]);
  });
});
