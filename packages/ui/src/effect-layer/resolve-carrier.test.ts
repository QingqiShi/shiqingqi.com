import { describe, expect, it } from "vitest";
import {
  PAGE_CARRIER,
  reachableCarriers,
  regionsOf,
  resolveCarrier,
  scrollRegionOf,
  stickiesOf,
  VIEWPORT_BOTTOM_CARRIER,
  VIEWPORT_CARRIER,
  type CarrierState,
  type EffectCarrierRef,
} from "./resolve-carrier.ts";

const sticky = (id: number, parent: EffectCarrierRef): EffectCarrierRef => ({
  kind: "sticky",
  id,
  parent,
});

const region = (id: number, parent: EffectCarrierRef): EffectCarrierRef => ({
  kind: "region",
  id,
  parent,
});

/** A state where the sticky boxes `ids` are stuck and every region is known. */
const stuck = (...ids: number[]): CarrierState => ({
  isStuck: (id) => ids.includes(id),
  hasRegion: () => true,
});

const everyRegion = () => true;

describe("resolveCarrier", () => {
  it("draws the page on the scroll canvases and the viewport on its own", () => {
    expect(resolveCarrier(PAGE_CARRIER, stuck())).toBe("page");
    expect(resolveCarrier(VIEWPORT_CARRIER, stuck())).toBe("fixed");
    expect(resolveCarrier(VIEWPORT_BOTTOM_CARRIER, stuck())).toBe(
      "fixedBottom",
    );
  });

  it("moves a sticky box on the page to the fixed canvas while it is stuck", () => {
    const bar = sticky(1, PAGE_CARRIER);
    expect(resolveCarrier(bar, stuck())).toBe("page");
    expect(resolveCarrier(bar, stuck(1))).toBe("fixed");
  });

  it("keeps a sticky box on the viewport on the viewport, stuck or not", () => {
    const title = sticky(1, VIEWPORT_BOTTOM_CARRIER);
    expect(resolveCarrier(title, stuck())).toBe("fixedBottom");
    expect(resolveCarrier(title, stuck(1))).toBe("fixedBottom");
  });

  it("takes a stuck sticky box around an unstuck one", () => {
    const inner = sticky(2, sticky(1, PAGE_CARRIER));
    expect(resolveCarrier(inner, stuck())).toBe("page");
    expect(resolveCarrier(inner, stuck(1))).toBe("fixed");
    expect(resolveCarrier(inner, stuck(2))).toBe("fixed");
  });

  it("does not read whether a sticky box on the viewport is stuck", () => {
    const read: number[] = [];
    resolveCarrier(sticky(1, VIEWPORT_CARRIER), {
      isStuck: (id) => {
        read.push(id);
        return true;
      },
      hasRegion: everyRegion,
    });
    expect(read).toEqual([]);
  });

  it("draws a Scroll region on its own canvases", () => {
    expect(resolveCarrier(region(4, PAGE_CARRIER), stuck())).toBe(4);
    expect(
      resolveCarrier(region(5, region(4, VIEWPORT_CARRIER)), stuck()),
    ).toBe(5);
  });

  it("draws a region on its parent until it has its scroller and its content box", () => {
    const sheet = region(4, VIEWPORT_CARRIER);
    expect(
      resolveCarrier(sheet, { isStuck: () => false, hasRegion: () => false }),
    ).toBe("fixed");
  });

  it("moves a sticky box in a region to the region's parent while it is stuck", () => {
    const title = sticky(1, region(4, VIEWPORT_CARRIER));
    expect(resolveCarrier(title, stuck())).toBe(4);
    expect(resolveCarrier(title, stuck(1))).toBe("fixed");
    const head = sticky(2, region(5, region(4, PAGE_CARRIER)));
    expect(resolveCarrier(head, stuck(2))).toBe(4);
  });

  it("moves a stuck sticky box in a region on the page to the page", () => {
    expect(resolveCarrier(sticky(1, region(4, PAGE_CARRIER)), stuck(1))).toBe(
      "page",
    );
  });
});

describe("reachableCarriers", () => {
  it("lists both carriers of a sticky box on the page", () => {
    expect(reachableCarriers(sticky(1, PAGE_CARRIER), everyRegion)).toEqual([
      "page",
      "fixed",
    ]);
    expect(
      reachableCarriers(sticky(2, sticky(1, PAGE_CARRIER)), everyRegion),
    ).toEqual(["page", "fixed"]);
  });

  it("lists one carrier for a carrier that does not move between them", () => {
    expect(reachableCarriers(PAGE_CARRIER, everyRegion)).toEqual(["page"]);
    expect(
      reachableCarriers(sticky(1, VIEWPORT_BOTTOM_CARRIER), everyRegion),
    ).toEqual(["fixedBottom"]);
    expect(reachableCarriers(region(4, PAGE_CARRIER), everyRegion)).toEqual([
      4,
    ]);
  });

  it("lists the region and its parent for a sticky box in a region", () => {
    expect(
      reachableCarriers(sticky(1, region(4, VIEWPORT_CARRIER)), everyRegion),
    ).toEqual([4, "fixed"]);
  });
});

describe("scrollRegionOf", () => {
  it("names the scroll that moves a carrier", () => {
    expect(scrollRegionOf(sticky(1, PAGE_CARRIER), everyRegion)).toBe("page");
    expect(
      scrollRegionOf(sticky(1, region(4, PAGE_CARRIER)), everyRegion),
    ).toBe(4);
    expect(scrollRegionOf(VIEWPORT_CARRIER, everyRegion)).toBeNull();
    expect(scrollRegionOf(region(4, VIEWPORT_CARRIER), () => false)).toBeNull();
  });
});

describe("stickiesOf and regionsOf", () => {
  it("lists the sticky boxes of the chain, the nearest first", () => {
    expect(stickiesOf(sticky(2, sticky(1, VIEWPORT_CARRIER)))).toEqual([2, 1]);
    expect(stickiesOf(sticky(2, region(4, sticky(1, PAGE_CARRIER))))).toEqual([
      2, 1,
    ]);
    expect(stickiesOf(PAGE_CARRIER)).toEqual([]);
  });

  it("lists the Scroll regions of the chain, the nearest first", () => {
    expect(regionsOf(sticky(2, region(5, region(4, PAGE_CARRIER))))).toEqual([
      5, 4,
    ]);
    expect(regionsOf(VIEWPORT_CARRIER)).toEqual([]);
  });
});
