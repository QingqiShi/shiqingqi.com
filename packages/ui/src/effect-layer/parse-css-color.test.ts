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
    ["rgb(51 102 153 / 0.5)", [0.2, 0.4, 0.6, 0.5]],
    ["transparent", [0, 0, 0, 0]],
  ] as const)("reads the sRGB form %s", (value, expected) => {
    expectColor(value, expected, 6);
  });

  it.each([
    ["color(display-p3 0.5 0.5 0.5)", [0.5, 0.5, 0.5, 1]],
    ["oklch(0.627955 0.257683 29.2339)", [1, 0, 0, 1]],
    ["lab(54.2905 80.8049 69.891)", [1, 0, 0, 1]],
  ] as const)("converts %s to sRGB", (value, expected) => {
    expectColor(value, expected, 2);
  });

  it("clamps a colour outside sRGB into it", () => {
    expectColor("color(display-p3 1 0 0)", [1, 0, 0, 1], 6);
  });

  it.each(["currentcolor", "rgb(1 2)", ""])("returns null for %j", (value) => {
    expect(parseCssColor(value)).toBeNull();
  });
});
