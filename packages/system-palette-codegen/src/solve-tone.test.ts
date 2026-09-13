import { describe, expect, it } from "vitest";
import { Hct } from "../../../apps/web/src/vendor/material-color-utilities/hct.ts";
import { argbFromHex } from "../../../apps/web/src/vendor/material-color-utilities/string_utils.ts";
import { hellwigLightness } from "./hellwig-lightness.ts";
import { hexAt, solveTone } from "./solve-tone.ts";
import { hueDistance, tintOf } from "./tint-of.ts";

describe("solveTone", () => {
  it("returns the extremes exactly", () => {
    expect(hexAt(282, 87, solveTone(282, 87, hellwigLightness, 0))).toBe(
      "#000000",
    );
    const white = hellwigLightness("#FFFFFF");
    expect(hexAt(282, 87, solveTone(282, 87, hellwigLightness, white))).toBe(
      "#FFFFFF",
    );
  });

  it("lands within 0.5 of the target for a saturated hue", () => {
    const target = hellwigLightness(hexAt(0, 0, 60));
    const tone = solveTone(282, 87, hellwigLightness, target);
    expect(tone).toBeLessThan(60);
    expect(
      Math.abs(hellwigLightness(hexAt(282, 87, tone)) - target),
    ).toBeLessThan(0.5);
  });
});

describe("hexAt", () => {
  it("keeps a near-white on its own tint instead of the gamut boundary", () => {
    const placed = Hct.fromInt(argbFromHex(hexAt(144.08, 2.35, 99.7)));
    const neutral = Hct.from(0, 0, placed.tone);
    const wanted = tintOf(144.08, 2.35, neutral);
    const got = tintOf(placed.hue, placed.chroma, neutral);
    expect(hueDistance(got.hue, wanted.hue)).toBeLessThanOrEqual(45);
    expect(got.chroma).toBeLessThanOrEqual(wanted.chroma + 1);
  });
});
