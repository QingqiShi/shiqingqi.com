import { afterEach, describe, expect, it, vi } from "vitest";
import { mount } from "../test-support/mount.ts";
import {
  carrierMismatch,
  checkDeclaredCarrier,
  isAtViewportBottom,
  stickyBoxesOn,
  viewportFixedBox,
} from "./check-declared-carrier.ts";
import {
  PAGE_CARRIER,
  VIEWPORT_BOTTOM_CARRIER,
  VIEWPORT_CARRIER,
  type EffectCarrierRef,
} from "./resolve-carrier.ts";

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

describe("stickyBoxesOn", () => {
  const viewportStickyBoxes = (element: Element) =>
    stickyBoxesOn(element, null).boxes;

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

const sticky = (parent: EffectCarrierRef = PAGE_CARRIER): EffectCarrierRef => ({
  kind: "sticky",
  id: 1,
  parent,
});

/**
 * The check's context, where sticky carrier 1 is the box `#bar`, and Scroll
 * region 2 has the scroller `#list`.
 */
const context = {
  styleOf: getComputedStyle,
  stickyBox: (id: number) => (id === 1 ? document.getElementById("bar") : null),
  regionScroller: (id: number) =>
    id === 2 ? document.getElementById("list") : null,
  hasRegion: (id: number) =>
    id === 2 && document.getElementById("list") !== null,
  isInModalCover: (element: Element) =>
    element.closest("[data-modal-cover]") !== null,
};

const region = (parent: EffectCarrierRef = PAGE_CARRIER): EffectCarrierRef => ({
  kind: "region",
  id: 2,
  parent,
});

/** Makes `box` as tall as `clientHeight` with content as tall as `scrollHeight`. */
function overflow(
  box: Element | null,
  clientHeight: number,
  scrollHeight: number,
) {
  if (box === null) {
    throw new Error("no box");
  }
  Object.defineProperty(box, "clientHeight", { value: clientHeight });
  Object.defineProperty(box, "scrollHeight", { value: scrollHeight });
}

describe("carrierMismatch", () => {
  it("agrees with an element on the page that declares nothing", () => {
    const target = mount("<div><p data-target></p></div>");
    expect(carrierMismatch(target, PAGE_CARRIER, context)).toBeNull();
  });

  it("reports a fixed element that declares no viewport", () => {
    const target = mount(
      '<header style="position: fixed; top: 0"><p data-target></p></header>',
    );
    expect(carrierMismatch(target, PAGE_CARRIER, context)).toMatch(
      /fixed ancestor/,
    );
    expect(carrierMismatch(target, VIEWPORT_CARRIER, context)).toBeNull();
  });

  it("reports the wrong edge of the viewport", () => {
    const bottom = mount(
      '<nav style="position: fixed; bottom: 16px"><p data-target></p></nav>',
    );
    expect(carrierMismatch(bottom, VIEWPORT_CARRIER, context)).toMatch(
      /viewport-bottom/,
    );
    expect(
      carrierMismatch(bottom, VIEWPORT_BOTTOM_CARRIER, context),
    ).toBeNull();

    const top = mount(
      '<nav style="position: fixed; top: 0"><p data-target></p></nav>',
    );
    expect(carrierMismatch(top, VIEWPORT_BOTTOM_CARRIER, context)).toMatch(
      /not fixed to the bottom/,
    );
  });

  it("reports a viewport declaration on an element that scrolls with the page", () => {
    const target = mount(
      '<div style="transform: scale(1)"><div style="position: fixed"><p data-target></p></div></div>',
    );
    expect(carrierMismatch(target, VIEWPORT_CARRIER, context)).toMatch(
      /scrolls with the page/,
    );
  });

  it("agrees with a viewport declaration in a modal cover, where the page cannot scroll", () => {
    const target = mount(
      '<div style="position: absolute; bottom: 0"><div data-modal-cover><p data-target></p></div></div>',
    );
    expect(carrierMismatch(target, VIEWPORT_CARRIER, context)).toBeNull();

    const outside = mount(
      '<div style="position: absolute; bottom: 0"><div><p data-target></p></div></div>',
    );
    expect(carrierMismatch(outside, VIEWPORT_CARRIER, context)).toMatch(
      /scrolls with the page/,
    );
  });

  it("still checks a Scroll region in a modal cover", () => {
    const target = mount(
      '<div data-modal-cover><div id="list" style="overflow-y: auto"><div id="bar" style="position: sticky; bottom: 0"><p data-target></p></div></div></div>',
    );
    expect(carrierMismatch(target, region(VIEWPORT_CARRIER), context)).toMatch(
      /no useEffectSticky declares it/,
    );
    expect(
      carrierMismatch(target, sticky(region(VIEWPORT_CARRIER)), context),
    ).toBeNull();
  });

  it("reports a sticky box that no sticky carrier declares", () => {
    const target = mount(
      '<div id="bar" style="position: sticky; top: 0"><p data-target></p></div>',
    );
    expect(carrierMismatch(target, PAGE_CARRIER, context)).toMatch(
      /useEffectSticky/,
    );
    expect(carrierMismatch(target, sticky(), context)).toBeNull();
  });

  it("reports a declared sticky box that sticks to a scroll container", () => {
    const target = mount(
      '<div style="overflow: auto"><div id="bar" style="position: sticky; top: 0"><p data-target></p></div></div>',
    );
    expect(carrierMismatch(target, sticky(), context)).toMatch(
      /scroll container/,
    );
  });

  it("reports a scroller that scrolls its content but that no Scroll region declares", () => {
    const target = mount(
      '<div id="list" style="overflow-y: auto"><div><p data-target></p></div></div>',
    );
    overflow(document.getElementById("list"), 100, 400);
    expect(carrierMismatch(target, PAGE_CARRIER, context)).toMatch(
      /useScrollRegion/,
    );
    expect(carrierMismatch(target, region(), context)).toBeNull();
  });

  it("agrees with a scroller whose content fits, and with one that only clips", () => {
    const fits = mount(
      '<div id="list" style="overflow-y: auto"><p data-target></p></div>',
    );
    overflow(document.getElementById("list"), 100, 100);
    expect(carrierMismatch(fits, PAGE_CARRIER, context)).toBeNull();
    const clips = mount(
      '<div style="overflow-y: hidden; overflow-x: auto"><p data-target></p></div>',
    );
    expect(carrierMismatch(clips, PAGE_CARRIER, context)).toBeNull();
  });

  it("reports a scroller nested in a Scroll region that no region declares", () => {
    const target = mount(
      '<div id="list" style="overflow-y: auto"><div id="inner" style="overflow-y: scroll"><p data-target></p></div></div>',
    );
    overflow(document.getElementById("list"), 100, 400);
    overflow(document.getElementById("inner"), 50, 300);
    expect(carrierMismatch(target, region(), context)).toMatch(
      /scroller <div#inner>/,
    );
  });

  it("agrees with a sticky box in a Scroll region that sticks to the region's scroller", () => {
    const target = mount(
      '<div id="list" style="overflow-y: auto"><div id="bar" style="position: sticky; top: 0"><p data-target></p></div></div>',
    );
    expect(carrierMismatch(target, sticky(region()), context)).toBeNull();
    expect(carrierMismatch(target, region(), context)).toMatch(
      /useEffectSticky/,
    );
    expect(carrierMismatch(target, sticky(), context)).toMatch(
      /scroll container <div#list>/,
    );
  });

  it("ignores a sticky box with no sticky offset, which never sticks", () => {
    const target = mount(
      '<div style="position: sticky"><p data-target></p></div>',
    );
    expect(carrierMismatch(target, PAGE_CARRIER, context)).toBeNull();
  });

  it("agrees with a sticky box that is fixed or in flow at this breakpoint", () => {
    const fixed = mount(
      '<aside id="bar" style="position: fixed; top: 0"><p data-target></p></aside>',
    );
    expect(carrierMismatch(fixed, sticky(), context)).toBeNull();
    const inFlow = mount(
      '<aside id="bar" style="position: static"><p data-target></p></aside>',
    );
    expect(carrierMismatch(inFlow, sticky(), context)).toBeNull();
  });
});

describe("checkDeclaredCarrier", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("warns one time for each element", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const target = mount(
      '<header style="position: fixed; top: 0"><p data-target></p></header>',
    );
    checkDeclaredCarrier(target, PAGE_CARRIER, context);
    checkDeclaredCarrier(target, PAGE_CARRIER, context);
    expect(warn).toHaveBeenCalledOnce();
  });

  it("stays silent when the declaration agrees", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const target = mount(
      '<header style="position: fixed; top: 0"><p data-target></p></header>',
    );
    checkDeclaredCarrier(target, VIEWPORT_CARRIER, context);
    expect(warn).not.toHaveBeenCalled();
  });
});
