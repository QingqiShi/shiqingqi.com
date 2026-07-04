import { describe, expect, it } from "vitest";
import {
  nearestPaletteTone,
  paletteHues,
  parseColor,
  withAlpha,
} from "./palette-match.ts";

describe("parseColor", () => {
  it("parses 6-digit hex", () => {
    expect(parseColor("#30312E")).toEqual({ r: 48, g: 49, b: 46, a: 1 });
  });

  it("parses shorthand hex", () => {
    expect(parseColor("#fff")).toEqual({ r: 255, g: 255, b: 255, a: 1 });
  });

  it("parses 8-digit hex with alpha", () => {
    const parsed = parseColor("#00000080");
    expect(parsed?.r).toBe(0);
    expect(parsed?.a).toBeCloseTo(0.5, 1);
  });

  it("parses rgb()", () => {
    expect(parseColor("rgb(48, 49, 46)")).toEqual({
      r: 48,
      g: 49,
      b: 46,
      a: 1,
    });
  });

  it("parses rgba() with alpha", () => {
    expect(parseColor("rgba(48, 49, 46, 0.4)")).toEqual({
      r: 48,
      g: 49,
      b: 46,
      a: 0.4,
    });
  });

  it("parses space-separated rgb with slash alpha", () => {
    expect(parseColor("rgb(48 49 46 / 0.4)")).toEqual({
      r: 48,
      g: 49,
      b: 46,
      a: 0.4,
    });
  });

  it("returns null for unparseable input", () => {
    expect(parseColor("not-a-color")).toBeNull();
    expect(parseColor("")).toBeNull();
  });
});

describe("nearestPaletteTone", () => {
  it("matches an exact palette swatch with zero distance", () => {
    // gray._20 is "#30312E" in the generated palette.
    const match = nearestPaletteTone("#30312E");
    expect(match).not.toBeNull();
    expect(match?.hue).toBe("gray");
    expect(match?.tone).toBe(20);
    expect(match?.distance).toBe(0);
  });

  it("resolves rgb() input to a lowercase hue id and a tone", () => {
    const match = nearestPaletteTone("rgb(48, 49, 46)");
    expect(match?.hue).toBe("gray");
    expect(match?.tone).toBe(20);
  });

  it("matches a neutral mid-gray to the gray hue", () => {
    // gray._50 is "#777774" (the gray source swatch).
    const match = nearestPaletteTone("#777774");
    expect(match?.hue).toBe("gray");
    expect(match?.tone).toBe(50);
    expect(match?.distance).toBe(0);
  });

  it("treats pure white as the lightest tone, breaking the hue tie toward gray", () => {
    // Every hue shares "#FFFFFF" at tone 100, so the hue is a tie; the neutral
    // `gray` hue is preferred so a neutral token doesn't bind to the red ramp.
    const match = nearestPaletteTone("#FFFFFF");
    expect(match?.hue).toBe("gray");
    expect(match?.tone).toBe(100);
    expect(match?.distance).toBe(0);
  });

  it("breaks the pure-black hue tie toward gray", () => {
    // "#000000" is every hue's _0; prefer gray over the first-iterated hue.
    const match = nearestPaletteTone("#000000");
    expect(match?.hue).toBe("gray");
    expect(match?.tone).toBe(0);
    expect(match?.distance).toBe(0);
  });

  it("returns null for unparseable input", () => {
    expect(nearestPaletteTone("nope")).toBeNull();
  });
});

describe("paletteHues", () => {
  it("exposes all 13 system hues, each with its full 21-tone ramp", () => {
    expect(paletteHues).toHaveLength(13);
    for (const hue of paletteHues) {
      expect(hue.tones).toHaveLength(21);
    }
  });

  it("uses lowercase hue ids matching the token namespace", () => {
    const ids = paletteHues.map((hue) => hue.hue);
    expect(ids).toContain("gray");
    expect(ids).toContain("purple");
    for (const id of ids) {
      expect(id).toBe(id.toLowerCase());
    }
  });

  it("carries the generated swatch hex and a readable fg per tone", () => {
    const gray = paletteHues.find((hue) => hue.hue === "gray");
    const tone92 = gray?.tones.find((swatch) => swatch.tone === 92);
    expect(tone92?.hex).toBe("#E9E8E4");
    expect(tone92?.fg).toBe("#000000");
    for (const hue of paletteHues) {
      for (const swatch of hue.tones) {
        expect(swatch.hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    }
  });
});

describe("withAlpha", () => {
  it("returns the hex unchanged when fully opaque", () => {
    expect(withAlpha("#30312E", 1)).toBe("#30312E");
  });

  it("returns the hex unchanged when alpha is null", () => {
    expect(withAlpha("#30312E", null)).toBe("#30312E");
  });

  it("composes rgba() preserving the swatch channels for translucent picks", () => {
    expect(withAlpha("#30312E", 0.08)).toBe("rgba(48, 49, 46, 0.08)");
  });

  it("rounds noisy alpha to three decimals", () => {
    expect(withAlpha("#30312E", 0.0784314)).toBe("rgba(48, 49, 46, 0.078)");
  });

  it("clamps out-of-range alpha", () => {
    expect(withAlpha("#30312E", -0.5)).toBe("rgba(48, 49, 46, 0)");
  });

  it("returns the input unchanged when the hex can't be parsed", () => {
    expect(withAlpha("nope", 0.5)).toBe("nope");
  });
});
