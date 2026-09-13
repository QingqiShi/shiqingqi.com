import { describe, expect, it } from "vitest";
import { Hct } from "../../../apps/web/src/vendor/material-color-utilities/hct.ts";
import { hexFromArgb } from "../../../apps/web/src/vendor/material-color-utilities/string_utils.ts";
import { hellwigLightness } from "./hellwig-lightness.ts";

const hexAt = (hue: number, chroma: number, tone: number) =>
  hexFromArgb(Hct.from(hue, chroma, tone).toInt());

describe("hellwigLightness", () => {
  it("is 0 at black and rises with tone for gray", () => {
    expect(hellwigLightness("#000000")).toBeCloseTo(0, 6);
    let previous = 0;
    for (const tone of [10, 30, 50, 70, 90, 100]) {
      const lightness = hellwigLightness(hexAt(0, 0, tone));
      expect(lightness).toBeGreaterThan(previous);
      previous = lightness;
    }
  });

  it("rates a saturated blue brighter than gray at the same L*, and yellow only slightly", () => {
    const gray = hellwigLightness(hexAt(0, 0, 50));
    const blue = hellwigLightness(hexAt(282, 87, 50));
    const yellow = hellwigLightness(hexAt(92, 62, 50));
    expect(blue - gray).toBeGreaterThan(8);
    expect(yellow - gray).toBeGreaterThan(0);
    expect(yellow - gray).toBeLessThan(3);
  });
});
