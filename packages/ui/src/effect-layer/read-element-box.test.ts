import { describe, expect, it } from "vitest";
import { layOut } from "../test-support/lay-out.ts";
import {
  effectiveGrayscale,
  isAtViewportBottom,
  isInSticky,
  isStuckToViewport,
  readCornerExponent,
  readElementBox,
  readGrayscale,
  resolveCornerRadii,
  viewportFixedBox,
  viewportStickyBoxes,
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

describe("viewportFixedBox", () => {
  it("is the nearest fixed box that the viewport holds", () => {
    const target = mount(
      '<div id="outer" style="position: fixed"><div id="inner" style="position: fixed"><p data-target></p></div></div>',
    );
    expect(viewportFixedBox(target)?.id).toBe("inner");
  });

  it("skips a fixed box that a transformed box holds, for the fixed box around them", () => {
    const target = mount(
      '<div id="outer" style="position: fixed"><div style="transform: scale(1)"><div style="position: fixed"><p data-target></p></div></div></div>',
    );
    expect(viewportFixedBox(target)?.id).toBe("outer");
  });

  it("is null in the document", () => {
    expect(viewportFixedBox(mount("<div><p data-target></p></div>"))).toBe(
      null,
    );
  });

  it("is the box itself for a fixed box", () => {
    const target = mount('<p data-target style="position: fixed"></p>');
    expect(viewportFixedBox(target)).toBe(target);
  });

  it("is null for a fixed box that a transformed ancestor holds", () => {
    expect(
      viewportFixedBox(
        mount(
          '<div style="transform: scale(1)"><div style="position: fixed"><p data-target></p></div></div>',
        ),
      ),
    ).toBe(null);
  });

  it("is the box that holds it when that box is fixed itself", () => {
    const target = mount(
      '<div id="outer" style="position: fixed; will-change: transform"><div style="position: fixed"><p data-target></p></div></div>',
    );
    expect(viewportFixedBox(target)?.id).toBe("outer");
  });
});

describe("isAtViewportBottom", () => {
  const box = (insets: string) =>
    mount(`<div data-target style="position: fixed; ${insets}"></div>`);

  it("is true for a box with a bottom inset and no top inset", () => {
    expect(isAtViewportBottom(box("bottom: 16px"))).toBe(true);
    expect(isAtViewportBottom(box("top: auto; bottom: 0"))).toBe(true);
  });

  it("is false for a box held by its top edge, or by both edges", () => {
    expect(isAtViewportBottom(box("top: 0"))).toBe(false);
    expect(isAtViewportBottom(box("top: 0; bottom: 0"))).toBe(false);
    expect(isAtViewportBottom(box(""))).toBe(false);
  });

  it("reads `auto` from the computed style map, where getComputedStyle gives a length", () => {
    const target = box("bottom: 16px");
    const insets: Record<string, string> = { top: "auto", bottom: "16px" };
    Object.defineProperty(target, "computedStyleMap", {
      value: () => ({ get: (property: string) => insets[property] }),
    });
    const used = document.createElement("div").style;
    used.top = "584px";
    used.bottom = "16px";
    expect(isAtViewportBottom(target, () => used)).toBe(true);
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

describe("viewportStickyBoxes", () => {
  it("lists each sticky box around the element that sticks to the viewport", () => {
    const target = mount(
      '<div id="outer" style="position: sticky"><div id="inner" style="position: sticky"><p data-target></p></div></div>',
    );
    expect(viewportStickyBoxes(target).map(({ id }) => id)).toEqual([
      "inner",
      "outer",
    ]);
  });

  it("leaves out a sticky box that sticks to a scroll container", () => {
    expect(
      viewportStickyBoxes(
        mount(
          '<div style="overflow: auto"><div style="position: sticky"><p data-target></p></div></div>',
        ),
      ),
    ).toEqual([]);
  });

  it("keeps a sticky box around a scroll container that holds the element", () => {
    expect(
      viewportStickyBoxes(
        mount(
          '<aside id="aside" style="position: sticky"><div style="overflow: auto"><p data-target></p></div></aside>',
        ),
      ).map(({ id }) => id),
    ).toEqual(["aside"]);
  });

  it("is empty inside a fixed box, which the viewport holds already", () => {
    expect(
      viewportStickyBoxes(
        mount(
          '<div style="position: fixed"><div style="position: sticky"><p data-target></p></div></div>',
        ),
      ),
    ).toEqual([]);
  });
});

/** A sticky bar with `inset`, laid out at `y` in the viewport. */
function stickyBar(inset: string, y: number) {
  const target = mount(
    `<div id="bar" style="position: sticky; ${inset}"><p data-target></p></div>`,
  );
  const bar = document.getElementById("bar");
  if (bar === null) {
    throw new Error("no bar");
  }
  layOut(bar, { x: 0, y, width: 300, height: 48 });
  layOut(target, { x: 8, y: y + 8, width: 120, height: 32 });
  return { bar, target };
}

describe("isStuckToViewport", () => {
  it("is true while the sticky box is at its offset from the top", () => {
    expect(isStuckToViewport(stickyBar("top: 64px", 64).bar)).toBe(true);
  });

  it("is false while the sticky box is below its offset, or pushed above it", () => {
    expect(isStuckToViewport(stickyBar("top: 64px", 300).bar)).toBe(false);
    expect(isStuckToViewport(stickyBar("top: 64px", 20).bar)).toBe(false);
  });

  it("reads an offset from the bottom of the viewport", () => {
    const { clientHeight } = document.documentElement;
    expect(
      isStuckToViewport(stickyBar("bottom: 16px", clientHeight - 64).bar),
    ).toBe(true);
    expect(
      isStuckToViewport(stickyBar("bottom: 16px", clientHeight + 200).bar),
    ).toBe(false);
  });

  it("is false for a sticky box with no offset", () => {
    expect(isStuckToViewport(stickyBar("", 0).bar)).toBe(false);
  });
});

describe("readElementBox", () => {
  it("puts an element on the fixed canvas while its sticky box is stuck, and on the scroll canvases when it is not", () => {
    const stuck = readElementBox(
      stickyBar("top: 64px", 64).target,
      getComputedStyle,
    );
    expect(stuck).toMatchObject({ fixed: true, sticksToViewport: true });
    const scrolled = readElementBox(
      stickyBar("top: 64px", 400).target,
      getComputedStyle,
    );
    expect(scrolled).toMatchObject({ fixed: false, sticksToViewport: true });
  });

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

  it("puts an element in a fixed box at the bottom edge on the bottom canvas", () => {
    const target = mount(
      '<nav style="position: fixed; bottom: 16px"><a data-target></a></nav>',
    );
    layOut(target, { x: 16, y: 700, width: 64, height: 48 });
    expect(readElementBox(target, getComputedStyle)).toMatchObject({
      fixed: true,
      fixedToBottom: true,
    });
  });

  it("keeps an element in a fixed box at the top edge on the fixed canvas", () => {
    const target = mount(
      '<header style="position: fixed; top: 0"><a data-target></a></header>',
    );
    layOut(target, { x: 16, y: 8, width: 64, height: 48 });
    expect(readElementBox(target, getComputedStyle)).toMatchObject({
      fixed: true,
      fixedToBottom: false,
    });
  });

  it("keeps an element out of a sticky box on the scroll canvases", () => {
    const target = mount('<div style="top: 0"><p data-target></p></div>');
    layOut(target, { x: 0, y: 0, width: 120, height: 32 });
    expect(readElementBox(target, getComputedStyle)).toMatchObject({
      fixed: false,
      sticksToViewport: false,
    });
  });
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
