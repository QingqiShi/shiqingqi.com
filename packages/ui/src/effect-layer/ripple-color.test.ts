import { describe, expect, it } from "vitest";
import type { EffectColor } from "./parse-css-color.ts";
import { isLightBackdrop, rippleColor } from "./ripple-color.ts";

const LIGHT_PAGE: EffectColor = [251 / 255, 249 / 255, 246 / 255, 1];
const DARK_PAGE: EffectColor = [0, 0, 0, 1];
const ACCENT: EffectColor = [160 / 255, 67 / 255, 208 / 255, 1];

const luma = ([red, green, blue]: readonly number[]) =>
  0.2126 * red + 0.7152 * green + 0.0722 * blue;

describe("isLightBackdrop", () => {
  it("tells a light page from a dark one", () => {
    expect(isLightBackdrop(LIGHT_PAGE)).toBe(true);
    expect(isLightBackdrop(DARK_PAGE)).toBe(false);
  });
});

describe("rippleColor", () => {
  it("keeps a fill that already stands out from the page", () => {
    const color = rippleColor(ACCENT, LIGHT_PAGE);
    for (const [index, channel] of color.entries()) {
      expect(channel).toBeCloseTo(ACCENT[index]);
    }
  });

  it("darkens a fill close to a light page, and keeps it neutral", () => {
    const [red, green, blue] = rippleColor([1, 1, 1, 1], LIGHT_PAGE);
    expect(luma([red, green, blue])).toBeLessThan(luma(LIGHT_PAGE) - 0.15);
    expect(
      Math.max(red, green, blue) - Math.min(red, green, blue),
    ).toBeLessThan(0.03);
  });

  it("lightens a fill close to a dark page", () => {
    const color = rippleColor([0.04, 0.04, 0.04, 1], DARK_PAGE);
    expect(luma(color)).toBeGreaterThan(0.04);
  });

  it("keeps the hue of a faint tint it moves", () => {
    const [red, green, blue] = rippleColor([0.6, 0.3, 0.8, 0.08], LIGHT_PAGE);
    expect(blue).toBeGreaterThan(green);
    expect(red).toBeGreaterThan(green);
  });

  it("takes a translucent fill as it shows over the page", () => {
    const halfAccent = rippleColor(
      [ACCENT[0], ACCENT[1], ACCENT[2], 0.5],
      DARK_PAGE,
    );
    for (const [index, channel] of halfAccent.entries()) {
      expect(channel).toBeCloseTo(ACCENT[index] / 2);
    }
  });
});
