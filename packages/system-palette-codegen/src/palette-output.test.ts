import { contrastRatio } from "@tuja/ui/utils/contrast-ratio";
import { describe, expect, it } from "vitest";
import { SYSTEM_PALETTE_TONES } from "./constants.ts";
import { pickForeground } from "./pick-foreground.ts";
import { resolveHue } from "./resolve-hue.ts";
import { SYSTEM_HUES, type SystemHueDefinition } from "./system-hues.ts";

// Re-derive each swatch the same way the generator does. The generated
// `*.stylex.ts` files can't be imported into this vitest harness (no StyleX
// babel plugin here — they'd hit a runtime guard on `stylex.defineConsts`),
// so we compute the same outputs from the source config and validate those.
const ramps = new Map(SYSTEM_HUES.map((hue) => [hue.name, resolveHue(hue)]));

function computeSwatch(
  hue: SystemHueDefinition,
  tone: number,
): { bg: string; fg: string } {
  const bg = ramps.get(hue.name)?.get(tone);
  if (!bg) throw new Error(`${hue.name} has no tone ${String(tone)}`);
  return { bg, fg: pickForeground(bg) };
}

describe("generated systemPalette", () => {
  it("foreground reaches at least 4.5:1 contrast (WCAG AA) against the swatch background", () => {
    // The generator picks whichever of pure black / pure white maximises
    // contrast. If a future palette change introduces a swatch that cannot
    // reach 4.5:1, relax this floor to 3:1 (the WCAG minimum for non-text UI
    // / large text) and document the affected swatches.
    for (const hue of SYSTEM_HUES) {
      for (const tone of SYSTEM_PALETTE_TONES) {
        const { bg, fg } = computeSwatch(hue, tone);
        const ratio = contrastRatio(bg, fg);
        expect(
          ratio,
          `${hue.name} ${String(tone)} (${bg} on ${fg}) only reaches ${ratio.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
