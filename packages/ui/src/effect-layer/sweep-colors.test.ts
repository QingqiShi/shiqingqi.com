import { describe, expect, it } from "vitest";
import { sweepColors } from "./sweep-colors.ts";

const WHITE = [1, 1, 1, 1] as const;
const BLACK = [0, 0, 0, 1] as const;
const PURPLE = [0.45, 0.25, 0.85, 1] as const;

describe("sweepColors", () => {
  it("heats the core far towards white on a dark page", () => {
    const { core, halo } = sweepColors(PURPLE, BLACK);
    expect(halo.slice(0, 3)).toEqual([...PURPLE.slice(0, 3)]);
    for (const channel of [0, 1, 2]) {
      expect(core[channel]).toBeGreaterThan(0.75);
      expect(core[channel]).toBeGreaterThanOrEqual(halo[channel]);
    }
  });

  it("deepens the core on a light page", () => {
    const { core, halo } = sweepColors(PURPLE, WHITE);
    for (const channel of [0, 1, 2]) {
      expect(core[channel]).toBeLessThan(halo[channel]);
      expect(core[channel]).toBeGreaterThan(halo[channel] * 0.5);
    }
  });

  it("moves a fill close to the page away from it", () => {
    const { halo } = sweepColors([0.97, 0.97, 0.97, 1], WHITE);
    expect(halo[0]).toBeLessThan(0.9);
  });
});
