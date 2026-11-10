import { describe, expect, it } from "vitest";
import { colorThemes } from "../color.stylex.ts";
import { opacityValue } from "../tokens.stylex.ts";
import { apcaContrast } from "./apca-contrast.ts";
import type { RgbChannels } from "./contrast-ratio.ts";
import { hexChannels } from "./hex-channels.ts";

const { light, dark } = colorThemes();

type Theme = typeof light;
type Triple = readonly [number, number, number];

const toLinear = (value: number) => {
  const v = value / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

const fromLinear = (value: number) =>
  255 *
  (value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055);

function toOklab([r, g, b]: RgbChannels): Triple {
  const [lr, lg, lb] = [toLinear(r), toLinear(g), toLinear(b)];
  const l = Math.cbrt(
    0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb,
  );
  const m = Math.cbrt(
    0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb,
  );
  const s = Math.cbrt(
    0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb,
  );
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function fromOklab([lightness, a, b]: Triple): RgbChannels {
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    fromLinear(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    fromLinear(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    fromLinear(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

function over(
  [r, g, b]: RgbChannels,
  alpha: number,
  [fr, fg, fb]: RgbChannels,
): RgbChannels {
  const blend = (top: number, under: number) =>
    top * alpha + under * (1 - alpha);
  return [blend(r, fr), blend(g, fg), blend(b, fb)];
}

/** An opaque token value: `#RRGGBB`, or an even oklab `color-mix()` of two. */
function opaque(value: string): RgbChannels {
  const mix = /^color-mix\(in oklab, (#\w{6}), (#\w{6})\)$/.exec(value);
  if (!mix?.[1] || !mix[2]) return hexChannels(value);
  const [x1, y1, z1] = toOklab(hexChannels(mix[1]));
  const [x2, y2, z2] = toOklab(hexChannels(mix[2]));
  return fromOklab([(x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2]);
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

/** Each fill that body and muted text land on. */
const TEXT_FILLS = [
  "bgCanvas",
  "bgSurface",
  "bgSurfaceRaised",
  "bgSurfaceHover",
  "bgSurfaceSelected",
  "bgSurfaceSelectedHover",
  "bgControl",
  "bgControlHover",
  "bgControlSelected",
  "bgControlPressed",
  "bgControlSunken",
] as const satisfies readonly (keyof Theme)[];

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
  it("keeps `fg` at Lc 75 on every fill and on the raised control", () => {
    for (const fill of [...TEXT_FILLS, "bgControlRaised"] as const) {
      expect(
        lc(opaque(theme.fg), opaque(theme[fill])),
        fill,
      ).toBeGreaterThanOrEqual(75);
    }
  });

  it("keeps `fgMuted` and `fgControl` at Lc 60 on every fill", () => {
    for (const fill of TEXT_FILLS) {
      const background = opaque(theme[fill]);
      expect(
        lc(opaque(theme.fgMuted), background),
        fill,
      ).toBeGreaterThanOrEqual(60);
      expect(
        lc(opaque(theme.fgControl), background),
        fill,
      ).toBeGreaterThanOrEqual(60);
    }
  });

  it("keeps `fgMuted` at Lc 60 on the neutral tint", () => {
    // color.stylex.ts names the tint on `bgSurfaceSelectedHover` as under the floor.
    for (const fill of TEXT_FILLS.filter(
      (f) => f !== "bgSurfaceSelectedHover",
    )) {
      const background = tint(theme.bgNeutralSubtle, opaque(theme[fill]));
      expect(
        lc(opaque(theme.fgMuted), background),
        fill,
      ).toBeGreaterThanOrEqual(60);
    }
  });

  it("keeps the selected label at Lc 60 on the raised control", () => {
    expect(
      lc(opaque(theme.fgControlSelected), opaque(theme.bgControlRaised)),
    ).toBeGreaterThanOrEqual(60);
  });

  it("keeps disabled `fg` quieter than `fgMuted`", () => {
    const surface = opaque(theme.bgSurface);
    const disabled = over(opaque(theme.fg), opacityValue.disabled, surface);
    expect(lc(disabled, surface)).toBeLessThan(
      lc(opaque(theme.fgMuted), surface),
    );
  });
});
