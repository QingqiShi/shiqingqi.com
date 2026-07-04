// Invariants over the generated palette table that the author-mode matching
// logic depends on. If codegen output ever drifts (missing tone, non-hex
// swatch, unshared extremes), these fail before palette-match starts giving
// silently wrong answers.

import { describe, expect, it } from "vitest";
import {
  SYSTEM_PALETTE_TONES,
  systemPalette,
} from "../_generated/palette/palette-table.ts";
import { parseColor } from "./palette-match.ts";

const SWATCH_HEX = /^#[0-9A-Fa-f]{6}$/;

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

describe("systemPalette", () => {
  it("defines 13 uniquely named hues", () => {
    expect(systemPalette).toHaveLength(13);
    const names = systemPalette.map((hue) => hue.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("gives every hue a 6-digit hex bg and fg for every tone", () => {
    for (const hue of systemPalette) {
      for (const tone of SYSTEM_PALETTE_TONES) {
        const swatch = hue.tones[tone];
        expect(swatch).toBeDefined();
        expect(swatch.bg).toMatch(SWATCH_HEX);
        expect(swatch.fg).toMatch(SWATCH_HEX);
      }
    }
  });

  it("shares pure black at tone 0 and pure white at tone 100 across hues", () => {
    // nearestPaletteTone's gray tie-break exists because every hue shares the
    // same extremes; if a hue stopped sharing them, that logic would be wrong.
    for (const hue of systemPalette) {
      expect(hue.tones[0].bg).toBe("#000000");
      expect(hue.tones[100].bg).toBe("#FFFFFF");
    }
  });

  it("every fg is parseable by parseColor", () => {
    for (const hue of systemPalette) {
      for (const tone of SYSTEM_PALETTE_TONES) {
        expect(parseColor(hue.tones[tone].fg)).not.toBeNull();
      }
    }
  });
});
