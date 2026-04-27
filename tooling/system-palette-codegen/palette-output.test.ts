import { describe, expect, it } from "vitest";
import {
  SYSTEM_PALETTE_TONES,
  systemPalette,
} from "../../src/_generated/system-palette.ts";
import { contrastRatio } from "./contrast.ts";

describe("generated systemPalette", () => {
  it("emits a swatch for every hue x tone (143 total)", () => {
    expect(systemPalette).toHaveLength(13);
    let count = 0;
    for (const palette of systemPalette) {
      for (const tone of SYSTEM_PALETTE_TONES) {
        const swatch = palette.tones[tone];
        expect(swatch).toBeDefined();
        expect(swatch.bg).toMatch(/^#[0-9A-F]{6}$/);
        expect(swatch.fg).toMatch(/^#[0-9A-F]{6}$/);
        count += 1;
      }
    }
    expect(count).toBe(143);
  });

  it("foreground reaches at least 4.5:1 contrast (WCAG AA) against the swatch background", () => {
    // The previous tone>=60 heuristic produced ~2.7:1 mid-tone labels
    // (Yellow 50, Green 50, etc.). Every swatch in the current palette can
    // hit AA (4.5:1) with either pure black or pure white as foreground —
    // the generator picks whichever maximises contrast. If a future palette
    // change introduces a swatch that cannot reach 4.5:1, relax this floor
    // to 3:1 (the WCAG minimum for non-text UI / large text) and document
    // the affected swatches.
    for (const palette of systemPalette) {
      for (const tone of SYSTEM_PALETTE_TONES) {
        const { bg, fg } = palette.tones[tone];
        const ratio = contrastRatio(bg, fg);
        expect(
          ratio,
          `${palette.name} ${String(tone)} (${bg} on ${fg}) only reaches ${ratio.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("foreground picks whichever of black/white has higher contrast", () => {
    for (const palette of systemPalette) {
      for (const tone of SYSTEM_PALETTE_TONES) {
        const { bg, fg } = palette.tones[tone];
        const blackRatio = contrastRatio(bg, "#000000");
        const whiteRatio = contrastRatio(bg, "#FFFFFF");
        const expected = blackRatio >= whiteRatio ? "#000000" : "#FFFFFF";
        expect(fg).toBe(expected);
      }
    }
  });
});
