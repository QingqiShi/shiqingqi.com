import { describe, expect, it } from "vitest";
import { layOut } from "../test-support/lay-out.ts";
import { mount } from "../test-support/mount.ts";
import {
  effectiveGrayscale,
  readCornerExponent,
  readElementBox,
  readGrayscale,
  readInsets,
  resolveCornerRadii,
} from "./read-element-box.ts";

const all = (radius: string) => [radius, radius, radius, radius] as const;

describe("resolveCornerRadii", () => {
  it("reads one px radius per corner, top-left first and clockwise", () => {
    expect(resolveCornerRadii(200, 100, ["8px", "0px", "24px", "4px"])).toEqual(
      [8, 0, 24, 4],
    );
  });

  it("scales radii that overlap down together, as CSS draws a pill", () => {
    expect(resolveCornerRadii(200, 40, all("100000px"))).toEqual([
      20, 20, 20, 20,
    ]);
  });

  it("scales every corner by the side that overflows most", () => {
    expect(
      resolveCornerRadii(100, 100, ["80px", "0px", "0px", "40px"]),
    ).toEqual([(80 * 100) / 120, 0, 0, (40 * 100) / 120]);
  });

  it("resolves a percentage against the width and the height", () => {
    expect(resolveCornerRadii(200, 100, all("50%"))).toEqual([50, 50, 50, 50]);
  });

  it("gives an elliptical corner its shorter radius", () => {
    expect(
      resolveCornerRadii(200, 100, ["20px 10px", "0px", "0px", "0px"]),
    ).toEqual([10, 0, 0, 0]);
  });

  it("reads a value it cannot resolve as a square corner", () => {
    expect(
      resolveCornerRadii(200, 100, ["", "calc(50% + 4px)", "-4px", "0px"]),
    ).toEqual([0, 0, 0, 0]);
  });
});

describe("readCornerExponent", () => {
  it.each([
    ["", 2],
    ["round", 2],
    ["squircle", 4],
    ["bevel", 1],
    ["scoop", 0.5],
    ["superellipse(3)", 8],
    ["superellipse(1.5)", 2 ** 1.5],
    ["square", 16],
    ["superellipse(infinity)", 16],
    ["notch", 1 / 16],
    ["superellipse(-infinity)", 1 / 16],
    ["unknown", 2],
  ])("reads %j as an exponent of %d", (shape, exponent) => {
    expect(readCornerExponent(shape)).toBeCloseTo(exponent, 6);
  });
});

describe("readInsets", () => {
  it("keeps `auto` from the computed style map, where getComputedStyle gives a length", () => {
    const target = mount(
      '<div data-target style="position: fixed; bottom: 16px"></div>',
    );
    const insets: Record<string, string> = {
      top: "auto",
      right: "auto",
      bottom: "16px",
      left: "0px",
    };
    Object.defineProperty(target, "computedStyleMap", {
      value: () => ({ get: (property: string) => insets[property] }),
    });
    expect(readInsets(target)).toEqual(insets);
  });
});

describe("readElementBox", () => {
  it.each([
    ["opacity: 0", null],
    ["visibility: hidden", null],
    ["opacity: 0.5", { width: 120 }],
  ])(
    "measures an element in a closed menu with %j as %o",
    (hidden, measured) => {
      const target = mount(
        `<div inert style="${hidden}"><div><p data-target></p></div></div>`,
      );
      layOut(target, { x: 0, y: 0, width: 120, height: 32 });
      const box = readElementBox(target, getComputedStyle);
      if (measured === null) {
        expect(box).toBeNull();
      } else {
        expect(box).toMatchObject(measured);
      }
    },
  );
});

describe("readGrayscale", () => {
  it.each([
    ["none", 0],
    ["", 0],
    ["grayscale(1)", 1],
    ["grayscale(0.25)", 0.25],
    ["grayscale(40%)", 0.4],
    ["grayscale()", 1],
    ["grayscale(3)", 1],
    ["blur(2px)", 0],
    ["blur(2px) grayscale(0.5) opacity(0.9)", 0.5],
  ])("reads %j as %d", (filter, grayscale) => {
    expect(readGrayscale(filter)).toBeCloseTo(grayscale);
  });

  it("applies each grayscale() to the colour the one before it kept", () => {
    expect(readGrayscale("grayscale(0.5) grayscale(0.5)")).toBeCloseTo(0.75);
  });
});

describe("effectiveGrayscale", () => {
  it("is 0 without a filter", () => {
    expect(effectiveGrayscale(mount("<div><p data-target></p></div>"))).toBe(0);
  });

  it("takes the filter of the element and of each ancestor together", () => {
    expect(
      effectiveGrayscale(
        mount(
          '<div style="filter: grayscale(0.5)"><div><p data-target style="filter: grayscale(0.5)"></p></div></div>',
        ),
      ),
    ).toBeCloseTo(0.75);
  });
});
