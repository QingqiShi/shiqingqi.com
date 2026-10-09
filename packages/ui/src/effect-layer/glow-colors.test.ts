import { describe, expect, it } from "vitest";
import { contrastRatio } from "../contrast/contrast-ratio.ts";
import {
  frostOpacity,
  glowColors,
  restingGlow,
  ringLightColors,
} from "./glow-colors.ts";

const WHITE = [1, 1, 1] as const;
const BLACK = [0, 0, 0] as const;
const GREY = [140 / 255, 139 / 255, 136 / 255] as const;
const PURPLE = [160 / 255, 67 / 255, 208 / 255] as const;
const LILAC = [227 / 255, 163 / 255, 255 / 255] as const;
const DARK_PAGE = [18 / 255, 18 / 255, 18 / 255] as const;

const OPAQUE_WHITE = [1, 1, 1, 1] as const;
const OPAQUE_BLACK = [0, 0, 0, 1] as const;
const OPAQUE_PURPLE = [0.45, 0.25, 0.85, 1] as const;

type Rgb = readonly [number, number, number];

const channels = ([red, green, blue]: Rgb) =>
  [red * 255, green * 255, blue * 255] as const;

function shown(track: Rgb, thumb: Rgb, opacity: number): Rgb {
  const at = (index: 0 | 1 | 2) =>
    track[index] + (thumb[index] - track[index]) * opacity;
  return [at(0), at(1), at(2)];
}

describe("frostOpacity", () => {
  it("keeps the least opacity where the thumb has contrast to spare", () => {
    expect(frostOpacity(BLACK, LILAC, 0.7, 3.3)).toBe(0.7);
  });

  it("raises the opacity until the thumb keeps the contrast", () => {
    const opacity = frostOpacity(WHITE, PURPLE, 0.5, 3.3);
    expect(opacity).toBeGreaterThan(0.5);
    expect(
      contrastRatio(channels(shown(PURPLE, WHITE, opacity)), channels(PURPLE)),
    ).toBeGreaterThanOrEqual(3.3 - 1e-3);
  });

  it("makes the thumb opaque where even the plain thumb has less contrast", () => {
    // White on this grey is 3.4:1.
    expect(frostOpacity(WHITE, GREY, 0.5, 3.8)).toBe(1);
  });
});

describe("restingGlow", () => {
  it.each([
    ["a light page", PURPLE, WHITE, WHITE, "halo"],
    ["a dark page", LILAC, BLACK, DARK_PAGE, "core"],
  ] as const)(
    "keeps the thumb's contrast over the glow on %s",
    (_page, fill, thumb, backdrop, towards) => {
      const colors = glowColors([...fill, 1], [...backdrop, 1]);
      const target = colors[towards];
      const glow = restingGlow(
        fill,
        [target[0], target[1], target[2]],
        thumb,
        1,
        3.8,
      );
      expect(contrastRatio(channels(thumb), channels(glow))).toBeGreaterThan(
        3.8 - 1e-3,
      );
      expect(glow).not.toEqual(fill);
    },
  );

  it("goes the whole way where the thumb has contrast to spare", () => {
    expect(restingGlow(LILAC, WHITE, BLACK, 0.5, 3.8)).toEqual([
      (LILAC[0] + 1) / 2,
      (LILAC[1] + 1) / 2,
      1,
    ]);
  });

  it("stays the fill where even the fill is below the contrast", () => {
    expect(restingGlow(LILAC, WHITE, WHITE, 0.5, 3.8)).toEqual(LILAC);
  });
});

describe("glowColors", () => {
  it("heats the core far towards white on a dark page", () => {
    const { core, halo } = glowColors(OPAQUE_PURPLE, OPAQUE_BLACK);
    expect(halo.slice(0, 3)).toEqual([...OPAQUE_PURPLE.slice(0, 3)]);
    for (const channel of [0, 1, 2]) {
      expect(core[channel]).toBeGreaterThan(0.75);
      expect(core[channel]).toBeGreaterThanOrEqual(halo[channel]);
    }
  });

  it("heats the core towards white on a light page too, and saturates the halo", () => {
    const { core, halo } = glowColors(OPAQUE_PURPLE, OPAQUE_WHITE);
    for (const channel of [0, 1, 2]) {
      expect(core[channel]).toBeGreaterThan(0.7);
      expect(core[channel]).toBeGreaterThan(halo[channel]);
    }
    // More chroma: the blue channel pulls further from the green one.
    expect(halo[2] - halo[1]).toBeGreaterThan(
      OPAQUE_PURPLE[2] - OPAQUE_PURPLE[1],
    );
  });

  it("moves a fill close to the page away from it", () => {
    const { halo } = glowColors([0.97, 0.97, 0.97, 1], OPAQUE_WHITE);
    expect(halo[0]).toBeLessThan(0.9);
  });
});

describe("ringLightColors", () => {
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

  it("tints the tail with the glow's colour", () => {
    const { tint } = ringLightColors(OPAQUE_PURPLE, OPAQUE_WHITE);
    expect(tint.slice(0, 3)).toEqual(
      glowColors(OPAQUE_PURPLE, OPAQUE_WHITE).halo.slice(0, 3),
    );
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
