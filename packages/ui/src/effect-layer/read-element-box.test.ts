import { describe, expect, it } from "vitest";
import {
  isFixedToViewport,
  isInSticky,
  readCornerExponent,
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

function mount(html: string) {
  document.body.innerHTML = html;
  const target = document.querySelector("[data-target]");
  if (target === null) {
    throw new Error("no target");
  }
  return target;
}

describe("isFixedToViewport", () => {
  it("is false in the document", () => {
    expect(isFixedToViewport(mount("<div><p data-target></p></div>"))).toBe(
      false,
    );
  });

  it("is true for a fixed box and everything inside it", () => {
    expect(
      isFixedToViewport(
        mount('<div style="position: fixed"><p data-target></p></div>'),
      ),
    ).toBe(true);
  });

  it("is false for a fixed box that a transformed ancestor holds", () => {
    expect(
      isFixedToViewport(
        mount(
          '<div style="transform: scale(1)"><div style="position: fixed"><p data-target></p></div></div>',
        ),
      ),
    ).toBe(false);
  });

  it("is true again when the box that holds it is fixed itself", () => {
    expect(
      isFixedToViewport(
        mount(
          '<div style="position: fixed; will-change: transform"><div style="position: fixed"><p data-target></p></div></div>',
        ),
      ),
    ).toBe(true);
  });
});

describe("isInSticky", () => {
  it("is false without a sticky box", () => {
    expect(isInSticky(mount("<div><p data-target></p></div>"))).toBe(false);
  });

  it("is true for a sticky box and everything inside it", () => {
    expect(
      isInSticky(
        mount('<div style="position: sticky"><p data-target></p></div>'),
      ),
    ).toBe(true);
  });
});
