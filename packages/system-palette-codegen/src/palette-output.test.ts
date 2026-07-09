import { describe, expect, it } from "vitest";
import {
  argbFromHex,
  hexFromArgb,
} from "../../../apps/web/src/vendor/material-color-utilities/string_utils.ts";
import { TonalPalette } from "../../../apps/web/src/vendor/material-color-utilities/tonal_palette.ts";
import { contrastRatio, pickForeground } from "./contrast.ts";
import { evaluateCurve, SYSTEM_HUES, SYSTEM_PALETTE_TONES } from "./source.ts";

// Re-derive each swatch the same way the generator does. The generated
// `*.stylex.ts` files can't be imported into this vitest harness (no StyleX
// babel plugin here — they'd hit a runtime guard on `stylex.defineConsts`),
// so we compute the same outputs from the source config and validate those.
function computeSwatch(
  source: string,
  curve: readonly number[],
  tone: number,
): { bg: string; fg: string } {
  const palette = TonalPalette.fromInt(argbFromHex(source));
  const shift = evaluateCurve(tone, curve);
  const adjusted = Math.max(0, Math.min(100, tone + shift));
  const bg = hexFromArgb(palette.tone(adjusted)).toUpperCase();
  const fg = pickForeground(bg);
  return { bg, fg };
}

const EXPECTED_SWATCH_COUNT = SYSTEM_HUES.length * SYSTEM_PALETTE_TONES.length;

describe("SYSTEM_PALETTE_TONES", () => {
  it("spans 0 to 100 in 21 strictly ascending steps", () => {
    expect(SYSTEM_PALETTE_TONES).toHaveLength(21);
    expect(SYSTEM_PALETTE_TONES[0]).toBe(0);
    expect(SYSTEM_PALETTE_TONES[SYSTEM_PALETTE_TONES.length - 1]).toBe(100);
    for (let index = 1; index < SYSTEM_PALETTE_TONES.length; index++) {
      expect(SYSTEM_PALETTE_TONES[index]).toBeGreaterThan(
        SYSTEM_PALETTE_TONES[index - 1],
      );
    }
  });
});

describe("SYSTEM_HUES", () => {
  it("defines 13 uniquely named hues", () => {
    expect(SYSTEM_HUES).toHaveLength(13);
    const names = SYSTEM_HUES.map((hue) => hue.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("shares pure black at tone 0 and pure white at tone 100 across hues", () => {
    // Nearest-swatch color matching relies on every hue sharing the same
    // extremes; if a hue stopped sharing them, hue-tie-break logic would break.
    for (const hue of SYSTEM_HUES) {
      expect(computeSwatch(hue.source, hue.curve, 0).bg).toBe("#000000");
      expect(computeSwatch(hue.source, hue.curve, 100).bg).toBe("#FFFFFF");
    }
  });
});

describe("generated systemPalette", () => {
  it(`emits a swatch for every hue x tone (${String(EXPECTED_SWATCH_COUNT)} total)`, () => {
    let count = 0;
    for (const hue of SYSTEM_HUES) {
      for (const tone of SYSTEM_PALETTE_TONES) {
        const swatch = computeSwatch(hue.source, hue.curve, tone);
        expect(swatch.bg).toMatch(/^#[0-9A-F]{6}$/);
        expect(swatch.fg).toMatch(/^#[0-9A-F]{6}$/);
        count += 1;
      }
    }
    expect(count).toBe(EXPECTED_SWATCH_COUNT);
  });

  it("foreground reaches at least 4.5:1 contrast (WCAG AA) against the swatch background", () => {
    // The generator picks whichever of pure black / pure white maximises
    // contrast. If a future palette change introduces a swatch that cannot
    // reach 4.5:1, relax this floor to 3:1 (the WCAG minimum for non-text UI
    // / large text) and document the affected swatches.
    for (const hue of SYSTEM_HUES) {
      for (const tone of SYSTEM_PALETTE_TONES) {
        const { bg, fg } = computeSwatch(hue.source, hue.curve, tone);
        const ratio = contrastRatio(bg, fg);
        expect(
          ratio,
          `${hue.name} ${String(tone)} (${bg} on ${fg}) only reaches ${ratio.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("foreground picks whichever of black/white has higher contrast", () => {
    for (const hue of SYSTEM_HUES) {
      for (const tone of SYSTEM_PALETTE_TONES) {
        const { bg, fg } = computeSwatch(hue.source, hue.curve, tone);
        const blackRatio = contrastRatio(bg, "#000000");
        const whiteRatio = contrastRatio(bg, "#FFFFFF");
        const expected = blackRatio >= whiteRatio ? "#000000" : "#FFFFFF";
        expect(fg).toBe(expected);
      }
    }
  });
});
