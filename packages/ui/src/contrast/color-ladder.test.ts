import { describe, expect, it } from "vitest";
import { colorThemes } from "../color.stylex.ts";
import { opacityValue } from "../tokens.stylex.ts";
import { apcaContrast } from "./apca-contrast.ts";
import { contrastRatio, type RgbChannels } from "./contrast-ratio.ts";
import { hexChannels } from "./hex-channels.ts";

const { light, dark } = colorThemes();

type Theme = typeof light;
function over(
  [r, g, b]: RgbChannels,
  alpha: number,
  [fr, fg, fb]: RgbChannels,
): RgbChannels {
  const blend = (top: number, under: number) =>
    top * alpha + under * (1 - alpha);
  return [blend(r, fr), blend(g, fg), blend(b, fb)];
}

/** A translucent `rgba(r,g,b, a)` token value, painted on `fill`. */
function tint(value: string, fill: RgbChannels): RgbChannels {
  const match = /^rgba\((\d+),(\d+),(\d+), ([\d.]+)\)$/.exec(value);
  if (!match) throw new Error(`Expected rgba(), got "${value}"`);
  const [, r = "", g = "", b = "", alpha = ""] = match;
  return over([Number(r), Number(g), Number(b)], Number(alpha), fill);
}

const lc = (text: RgbChannels, background: RgbChannels) =>
  Math.abs(apcaContrast(text, background));

/** The opaque surfaces. */
const SURFACES = [
  "background",
  "card",
  "popover",
  "sidebar",
] as const satisfies readonly (keyof Theme)[];

/** The neutral fills that text lands on. */
const FILLS = [
  "muted",
  "accent",
  "secondary",
] as const satisfies readonly (keyof Theme)[];

const MEANINGS = [
  "primary",
  "destructive",
  "success",
  "warning",
  "info",
] as const satisfies readonly (keyof Theme)[];

function grounds(theme: Theme) {
  return [...SURFACES, ...FILLS].map((name) => ({
    name,
    fill: hexChannels(theme[name]),
  }));
}

describe("apcaContrast", () => {
  it("matches the APCA-W3 reference values", () => {
    expect(apcaContrast("#000000", "#FFFFFF")).toBeCloseTo(106.04, 1);
    expect(apcaContrast("#FFFFFF", "#000000")).toBeCloseTo(-107.88, 1);
    expect(apcaContrast("#888888", "#FFFFFF")).toBeCloseTo(63.06, 1);
    expect(apcaContrast("#FFFFFF", "#888888")).toBeCloseTo(-68.54, 1);
  });
});

describe.each([
  ["light", light],
  ["dark", dark],
])("the %s text ladder", (_, theme: Theme) => {
  it("keeps `foreground` at Lc 75 on every surface and fill", () => {
    for (const { name, fill } of grounds(theme)) {
      expect(
        lc(hexChannels(theme.foreground), fill),
        name,
      ).toBeGreaterThanOrEqual(75);
    }
  });

  it("keeps `mutedForeground` at Lc 60 on every surface and fill", () => {
    for (const { name, fill } of grounds(theme)) {
      expect(
        lc(hexChannels(theme.mutedForeground), fill),
        name,
      ).toBeGreaterThanOrEqual(60);
    }
  });

  it("keeps the text of each meaning at Lc 60 on every surface and on its tint", () => {
    for (const meaning of MEANINGS) {
      const text = hexChannels(theme[`${meaning}Text`]);
      for (const surface of SURFACES) {
        const base = hexChannels(theme[surface]);
        expect(
          lc(text, base),
          `${meaning} on ${surface}`,
        ).toBeGreaterThanOrEqual(60);
        expect(
          lc(text, tint(theme[`${meaning}Subtle`], base)),
          `${meaning} on its tint on ${surface}`,
        ).toBeGreaterThanOrEqual(60);
      }
    }
  });

  it("keeps `primaryText` at Lc 60 on the selected segment", () => {
    // segment-track.stylex.ts: the card in light, and in dark the card with
    // 20% of the foreground.
    const card = hexChannels(theme.card);
    const raised =
      theme === dark ? over(hexChannels(theme.foreground), 0.2, card) : card;
    expect(lc(hexChannels(theme.primaryText), raised)).toBeGreaterThanOrEqual(
      60,
    );
  });

  it("keeps `borderStrong` at 3:1 on every surface", () => {
    for (const surface of SURFACES) {
      expect(
        contrastRatio(
          hexChannels(theme.borderStrong),
          hexChannels(theme[surface]),
        ),
        surface,
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps disabled `foreground` quieter than `mutedForeground`", () => {
    const surface = hexChannels(theme.card);
    const disabled = over(
      hexChannels(theme.foreground),
      opacityValue.disabled,
      surface,
    );
    expect(lc(disabled, surface)).toBeLessThan(
      lc(hexChannels(theme.mutedForeground), surface),
    );
  });
});
