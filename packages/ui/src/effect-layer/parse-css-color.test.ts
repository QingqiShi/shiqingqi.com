import { describe, expect, it } from "vitest";
import { parseCssColor } from "./parse-css-color.ts";

function expectColor(
  value: string,
  expected: readonly [number, number, number, number],
  digits = 3,
) {
  const color = parseCssColor(value);
  expect(color).not.toBeNull();
  for (const [index, channel] of expected.entries()) {
    expect(color?.[index]).toBeCloseTo(channel, digits);
  }
}

describe("parseCssColor", () => {
  it.each([
    ["rgb(255, 0, 0)", [1, 0, 0, 1]],
    ["rgba(0, 0, 0, 0)", [0, 0, 0, 0]],
    ["rgba(51, 102, 153, 0.5)", [0.2, 0.4, 0.6, 0.5]],
    ["rgb(51 102 153 / 0.5)", [0.2, 0.4, 0.6, 0.5]],
    ["rgb(100% 50% 0% / 50%)", [1, 0.5, 0, 0.5]],
    ["transparent", [0, 0, 0, 0]],
    ["  RGB(255, 255, 255)  ", [1, 1, 1, 1]],
  ] as const)("reads the sRGB form %s", (value, expected) => {
    expectColor(value, expected, 6);
  });

  it.each([
    ["color(srgb 0.25 0.5 0.75 / 0.25)", [0.25, 0.5, 0.75, 0.25]],
    ["color(srgb-linear 0.214041 0 1)", [0.5, 0, 1, 1]],
    ["color(display-p3 0.5 0.5 0.5)", [0.5, 0.5, 0.5, 1]],
    ["color(xyz-d65 0.95047 1 1.08883)", [1, 1, 1, 1]],
    ["color(xyz-d50 0.96422 1 0.82521)", [1, 1, 1, 1]],
    ["oklab(1 0 0)", [1, 1, 1, 1]],
    ["oklch(0.627955 0.257683 29.2339)", [1, 0, 0, 1]],
    ["oklch(0.5 none none / 0.4)", [0.3885, 0.3885, 0.3885, 0.4]],
    ["lab(54.2905 80.8049 69.891)", [1, 0, 0, 1]],
    ["lch(54.2905 106.8372 40.8526)", [1, 0, 0, 1]],
  ] as const)("converts %s to sRGB", (value, expected) => {
    expectColor(value, expected, 2);
  });

  it("clamps a colour outside sRGB into it", () => {
    expectColor("color(display-p3 1 0 0)", [1, 0, 0, 1], 6);
    expectColor("rgb(300 -20 0 / 1.5)", [1, 0, 0, 1], 6);
  });

  it.each([
    "currentcolor",
    "#ff0000",
    "hsl(0 100% 50%)",
    "color(rec2020 1 0 0)",
    "rgb(1 2)",
    "rgb(a b c)",
    "",
  ])("returns null for %j", (value) => {
    expect(parseCssColor(value)).toBeNull();
  });
});
