import { describe, expect, it } from "vitest";
import {
  carrierCanvases,
  PAGE_CARRIER,
  resolveCarrier,
  stickiesOf,
  VIEWPORT_BOTTOM_CARRIER,
  VIEWPORT_CARRIER,
  type EffectCarrierRef,
} from "./resolve-carrier.ts";

const sticky = (id: number, parent: EffectCarrierRef): EffectCarrierRef => ({
  kind: "sticky",
  id,
  parent,
});

const stuck =
  (...ids: number[]) =>
  (id: number) =>
    ids.includes(id);

describe("resolveCarrier", () => {
  it("draws the page on the scroll canvases and the viewport on its own", () => {
    expect(resolveCarrier(PAGE_CARRIER, stuck())).toBe("scroll");
    expect(resolveCarrier(VIEWPORT_CARRIER, stuck())).toBe("fixed");
    expect(resolveCarrier(VIEWPORT_BOTTOM_CARRIER, stuck())).toBe(
      "fixedBottom",
    );
  });

  it("moves a sticky box on the page to the fixed canvas while it is stuck", () => {
    const bar = sticky(1, PAGE_CARRIER);
    expect(resolveCarrier(bar, stuck())).toBe("scroll");
    expect(resolveCarrier(bar, stuck(1))).toBe("fixed");
  });

  it("keeps a sticky box on the viewport on the viewport, stuck or not", () => {
    const title = sticky(1, VIEWPORT_BOTTOM_CARRIER);
    expect(resolveCarrier(title, stuck())).toBe("fixedBottom");
    expect(resolveCarrier(title, stuck(1))).toBe("fixedBottom");
  });

  it("takes a stuck sticky box around an unstuck one", () => {
    const inner = sticky(2, sticky(1, PAGE_CARRIER));
    expect(resolveCarrier(inner, stuck())).toBe("scroll");
    expect(resolveCarrier(inner, stuck(1))).toBe("fixed");
    expect(resolveCarrier(inner, stuck(2))).toBe("fixed");
  });

  it("does not read whether a sticky box on the viewport is stuck", () => {
    const read: number[] = [];
    resolveCarrier(sticky(1, VIEWPORT_CARRIER), (id) => {
      read.push(id);
      return true;
    });
    expect(read).toEqual([]);
  });
});

describe("carrierCanvases", () => {
  it("lists both canvases of a sticky box on the page", () => {
    expect(carrierCanvases(sticky(1, PAGE_CARRIER))).toEqual([
      "scroll",
      "fixed",
    ]);
    expect(carrierCanvases(sticky(2, sticky(1, PAGE_CARRIER)))).toEqual([
      "scroll",
      "fixed",
    ]);
  });

  it("lists one canvas for a carrier that does not move between them", () => {
    expect(carrierCanvases(PAGE_CARRIER)).toEqual(["scroll"]);
    expect(carrierCanvases(sticky(1, VIEWPORT_BOTTOM_CARRIER))).toEqual([
      "fixedBottom",
    ]);
  });
});

describe("stickiesOf", () => {
  it("lists the sticky boxes of the chain, the nearest first", () => {
    expect(stickiesOf(sticky(2, sticky(1, VIEWPORT_CARRIER)))).toEqual([2, 1]);
    expect(stickiesOf(PAGE_CARRIER)).toEqual([]);
  });
});
