import { describe, expect, it } from "vitest";
import { themeSource } from "./tokens.stylex.ts";

// Guards the text ladder against the two ways it can rot: a level drifting
// under the WCAG AA minimum on a surface it lands on, and the levels drifting
// together until they stop reading as separate levels.

const AA_SMALL_TEXT = 4.5;

// The quietest step either theme currently affords. Not a spec number — it is
// a floor under the current design so a future tone swap has to be deliberate.
const MIN_STEP_LIGHTNESS = 9;

const LADDER = ["textMain", "textMuted", "textSubtle"] as const;

// Opaque backgrounds the ladder is allowed to sit on. `bgSurfaceBright`,
// `bgInverse` and the intent tints are excluded: they pair with their own
// foreground token (`textOnBright`, `textOnInverse`, `infoText`, …).
const SURFACES = [
  "bgCanvas",
  "bgCanvasSubtle",
  "bgSurface",
  "bgSurfaceRaised",
  "bgSurfaceSunken",
  "bgInteractiveRest",
  "bgInteractiveHover",
  "bgInteractivePressed",
  "bgInteractiveSelected",
  "bgInteractiveDisabled",
  "surfaceNeutralSubtle",
] as const;

function channelToLinear(value8Bit: number) {
  const v = value8Bit / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) =>
    channelToLinear(Number.parseInt(hex.slice(i, i + 2), 16)),
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: string, b: string) {
  const [x, y] = [relativeLuminance(a), relativeLuminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** CIE L*, so a step reads as perceived lightness rather than a ratio. */
function lightness(hex: string) {
  const y = relativeLuminance(hex);
  return y > 0.008856 ? 116 * Math.cbrt(y) - 16 : 903.3 * y;
}

describe.each(["light", "dark"] as const)("%s text ladder", (scheme) => {
  const theme = themeSource[scheme];

  it.each(LADDER)("%s clears AA on every surface it can land on", (role) => {
    const worst = SURFACES.map((surface) => ({
      surface,
      ratio: contrastRatio(theme[role], theme[surface]),
    })).sort((a, b) => a.ratio - b.ratio)[0];

    expect(
      worst.ratio,
      `worst pairing is ${worst.surface} at ${worst.ratio.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(AA_SMALL_TEXT);
  });

  it("keeps every level distinguishable from the next", () => {
    const steps = LADDER.slice(0, -1).map((role, i) => {
      const next = LADDER[i + 1];
      return {
        step: `${role}→${next}`,
        delta: Math.abs(lightness(theme[next]) - lightness(theme[role])),
      };
    });

    for (const { step, delta } of steps) {
      expect(delta, `${step} is only ΔL* ${delta.toFixed(1)}`).toBeGreaterThan(
        MIN_STEP_LIGHTNESS,
      );
    }
  });
});
