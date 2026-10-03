import { describe, expect, it } from "vitest";
import { dustColor, isDarkBackground, packColor } from "./dust-color.ts";
import { toLinear } from "./parse-css-color.ts";

const luminance = (color: readonly number[]) => {
  const [red, green, blue] = color.map(toLinear);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

describe("isDarkBackground", () => {
  it.each([
    [[1, 1, 1, 1], false],
    [[0.97, 0.97, 0.96, 1], false],
    [[0.5, 0.5, 0.5, 1], false],
    [[0.2, 0.2, 0.2, 1], true],
    [[0, 0, 0, 1], true],
  ] as const)("reads %j as dark: %s", (background, dark) => {
    expect(isDarkBackground(background)).toBe(dark);
  });
});

describe("dustColor", () => {
  it("darkens a light fill on a light page to a mid tone", () => {
    const color = dustColor([1, 1, 1, 1], false);
    expect(luminance(color)).toBeCloseTo(0.16, 3);
    expect(color[0]).toBeCloseTo(color[1], 6);
    expect(color[1]).toBeCloseTo(color[2], 6);
  });

  it("keeps the hue of a fill it darkens", () => {
    const fill = [0.8, 0.6, 1, 1] as const;
    const [red, green, blue] = dustColor(fill, false).map(toLinear);
    expect(red / blue).toBeCloseTo(toLinear(0.8) / toLinear(1), 6);
    expect(green / blue).toBeCloseTo(toLinear(0.6) / toLinear(1), 6);
  });

  it("lightens a dark fill on a dark page", () => {
    const color = dustColor([0.12, 0.12, 0.14, 1], true);
    expect(luminance(color)).toBeCloseTo(0.6, 3);
  });

  it("keeps a fill that already stands clear of the page", () => {
    for (const [fill, dark] of [
      [[0.1, 0.2, 0.9, 1], false],
      [[1, 0.9, 0.6, 1], true],
    ] as const) {
      for (const [index, channel] of dustColor(fill, dark).entries()) {
        expect(channel).toBeCloseTo(fill[index], 6);
      }
    }
  });

  it("sheds grey dust from a fill too transparent to see", () => {
    const light = dustColor([1, 0, 0, 0], false);
    const dark = dustColor([1, 0, 0, 0], true);
    expect(light[0]).toBeCloseTo(light[1], 6);
    expect(luminance(light)).toBeCloseTo(0.16, 3);
    expect(dark[0]).toBeCloseTo(dark[2], 6);
    expect(luminance(dark)).toBeCloseTo(0.6, 3);
  });
});

describe("packColor", () => {
  it("puts red in the lowest byte, as unpack4x8unorm reads it", () => {
    expect(packColor([1, 0, 0, 0])).toBe(0x00_00_00_ff);
    expect(packColor([0, 0, 0, 1])).toBe(0xff_00_00_00);
    expect(packColor([0.2, 0.4, 0.6, 0.8])).toBe(0xcc_99_66_33);
  });

  it("clamps each channel to a byte", () => {
    expect(packColor([2, -1, 0.5, 1])).toBe(0xff_80_00_ff);
  });
});
