import { describe, expect, it } from "vitest";
import { ringLightColors } from "./ring-light-colors.ts";

const OPAQUE_WHITE = [1, 1, 1, 1] as const;
const OPAQUE_BLACK = [0, 0, 0, 1] as const;
const OPAQUE_PURPLE = [0.45, 0.25, 0.85, 1] as const;

describe("ringLightColors", () => {
  it("tints with the fill on a dark page", () => {
    const { tint } = ringLightColors(OPAQUE_PURPLE, OPAQUE_BLACK);
    expect(tint.slice(0, 3)).toEqual([...OPAQUE_PURPLE.slice(0, 3)]);
  });

  it("saturates the tint on a light page", () => {
    const { tint } = ringLightColors(OPAQUE_PURPLE, OPAQUE_WHITE);
    // More chroma: the blue channel pulls further from the green one.
    expect(tint[2] - tint[1]).toBeGreaterThan(
      OPAQUE_PURPLE[2] - OPAQUE_PURPLE[1],
    );
  });

  it("moves a fill close to the page away from it", () => {
    const { tint } = ringLightColors([0.97, 0.97, 0.97, 1], OPAQUE_WHITE);
    expect(tint[0]).toBeLessThan(0.9);
  });

  it.each([
    ["a dark page", OPAQUE_BLACK],
    ["a light page", OPAQUE_WHITE],
  ] as const)("makes the core a near-white glint on %s", (_page, backdrop) => {
    const { core, tint } = ringLightColors(OPAQUE_PURPLE, backdrop);
    for (const channel of [0, 1, 2]) {
      expect(core[channel]).toBeGreaterThan(0.9);
      expect(core[channel]).toBeGreaterThanOrEqual(tint[channel]);
    }
  });

  it.each([
    ["a dark page", OPAQUE_BLACK],
    ["a light page", OPAQUE_WHITE],
  ] as const)(
    "blooms between the tint and the core on %s",
    (_page, backdrop) => {
      const { bloom, core, tint } = ringLightColors(OPAQUE_PURPLE, backdrop);
      for (const channel of [0, 1, 2]) {
        expect(bloom[channel]).toBeGreaterThan(tint[channel]);
        expect(bloom[channel]).toBeLessThan(core[channel]);
      }
    },
  );

  it("keeps the bloom more of the tint on a light page", () => {
    const light = ringLightColors(OPAQUE_PURPLE, OPAQUE_WHITE);
    const dark = ringLightColors(OPAQUE_PURPLE, OPAQUE_BLACK);
    expect(light.bloom[1] - light.tint[1]).toBeLessThan(
      dark.bloom[1] - dark.tint[1],
    );
  });
});
