import { describe, expect, it } from "vitest";
import { clockAt } from "../test-support/clock-at.ts";
import { carrierOf } from "./carrier-of.ts";
import {
  createMeasureContext,
  type MeasureContext,
} from "./create-element-tracker.ts";
import type { RegionPlace } from "./create-scroll-region.ts";
import type { ElementBox } from "./read-element-box.ts";
import { PAGE_CARRIER, type CarrierKey } from "./resolve-carrier.ts";
import type { CanvasKit, CarrierFrame, CarrierSurface } from "./types.ts";

const PIXEL_RATIO = 2;

/**
 * A kit that configures each `<canvas>` element except those in `broken`,
 * and records each size it gives and each `<canvas>` element it releases.
 */
function fakeKit(broken: readonly HTMLCanvasElement[] = []) {
  const sized: { canvas: HTMLCanvasElement; width: number; height: number }[] =
    [];
  const released: HTMLCanvasElement[] = [];
  const kit: CanvasKit<CarrierSurface> = {
    configure: (canvas) =>
      broken.includes(canvas)
        ? null
        : { canvas, bindGroup: { label: canvas.id } },
    release: ({ canvas }) => {
      released.push(canvas);
    },
    size: (canvas, width, height) => {
      sized.push({ canvas, width, height });
      canvas.width = Math.round(width * PIXEL_RATIO);
      canvas.height = Math.round(height * PIXEL_RATIO);
    },
  };
  return { kit, sized, released };
}

function canvases(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const canvas = document.createElement("canvas");
    canvas.id = `canvas-${String(index)}`;
    return canvas;
  });
}

/**
 * A frame at a window scroll over a document 800 px wide and 5000 px tall,
 * with a large viewport 1000 px tall: bands of 1200 px with a margin of
 * 100 px.
 */
function frameAt({
  scrollX = 0,
  scrollY = 0,
  viewportHeight = 1000,
  viewportBottom = 1000,
  pixelRatio = PIXEL_RATIO,
  regions = new Map<number, RegionPlace>(),
}: {
  scrollX?: number;
  scrollY?: number;
  viewportHeight?: number;
  viewportBottom?: number;
  pixelRatio?: number;
  regions?: ReadonlyMap<number, RegionPlace>;
} = {}): CarrierFrame {
  return {
    clock: {
      ...clockAt(scrollX, scrollY, viewportBottom),
      regionPlace: (id) => regions.get(id) ?? null,
    },
    document: { left: 0, top: 0, width: 800, height: 5000 },
    viewportHeight,
    pixelRatio,
  };
}

const RANGE = { firstElement: 3, elementCount: 2 };

function setUp(key: CarrierKey, count: number, frame = frameAt()) {
  const given = canvases(count);
  const fake = fakeKit();
  const carrierCanvases = carrierOf(key).createCanvases(given, fake.kit);
  carrierCanvases.size(frame);
  return { given, carrierCanvases, ...fake };
}

describe("a banded carrier", () => {
  it("puts the page's two canvases on the bands that the scroll shows, each with a scissor on the part drawn this frame", () => {
    const frame = frameAt({ scrollY: 1500 });
    const { given, carrierCanvases } = setUp("page", 2, frame);
    const passes = carrierCanvases.passes(frame, 0, RANGE);

    expect(passes.map(({ surface }) => surface.canvas)).toEqual([
      given[1],
      given[0],
    ]);
    expect(given[1].style.transform).toBe("translateY(1200px)");
    expect(given[0].style.transform).toBe("translateY(2400px)");
    expect(passes.map(({ scissor }) => scissor)).toEqual([
      { x: 0, y: 400, width: 1600, height: 2000 },
      { x: 0, y: 0, width: 1600, height: 400 },
    ]);
    expect(passes[0].target).toMatchObject({
      carrier: 0,
      band: { index: 1, slot: 1 },
      x: 0,
      y: 1200,
      width: 800,
      height: 1200,
      drawnPageRange: [1400, 2400],
      firstElement: 3,
      elementCount: 2,
      bindGroup: { label: "canvas-1" },
    });
    expect(passes[1].target.drawnPageRange).toEqual([2400, 2600]);
  });

  it("moves a canvas only when its band changes, until a new size resets it", () => {
    const frame = frameAt();
    const { given, carrierCanvases } = setUp("page", 2, frame);
    carrierCanvases.passes(frame, 0, RANGE);
    given[0].style.transform = "none";

    carrierCanvases.passes(frame, 0, RANGE);
    expect(given[0].style.transform).toBe("none");

    const taller = frameAt({ viewportHeight: 1100 });
    carrierCanvases.size(taller);
    carrierCanvases.passes(taller, 0, RANGE);
    expect(given[0].style.transform).toBe("translateY(0px)");
  });

  it("sizes its canvases again only for a new width, band height or pixel ratio", () => {
    const { carrierCanvases, sized } = setUp("page", 2);
    expect(sized).toMatchObject([
      { width: 800, height: 1200 },
      { width: 800, height: 1200 },
    ]);

    carrierCanvases.size(frameAt({ scrollY: 700 }));
    expect(sized).toHaveLength(2);

    carrierCanvases.size(frameAt({ pixelRatio: 3 }));
    expect(sized).toHaveLength(4);
  });

  it("draws a Scroll region at the page place of its content box, at its scrollport's bands, and only near the viewport", () => {
    const regions = new Map([
      [
        4,
        {
          origin: { x: 100, y: 3000 },
          scrollTop: 0,
          viewportHeight: 500,
          width: 300.4,
          height: 2000,
        },
      ],
    ]);
    const { given, carrierCanvases, sized } = setUp(4, 2, frameAt({ regions }));
    expect(sized[0]).toMatchObject({ width: 300, height: 600 });

    expect(carrierCanvases.passes(frameAt({ regions }), 3, RANGE)).toEqual([]);

    const near = carrierCanvases.passes(
      frameAt({ scrollY: 2600, regions }),
      3,
      RANGE,
    );
    expect(near.map(({ target }) => target)).toMatchObject([
      {
        carrier: 3,
        band: { index: 0 },
        x: 100,
        y: 3000,
        width: 300,
        height: 600,
        drawnPageRange: [3000, 3550],
      },
    ]);
    expect(given[0].style.transform).toBe("translateY(0px)");
  });

  it("draws nothing for a Scroll region with no place", () => {
    const { carrierCanvases, sized } = setUp(4, 2);
    expect(sized).toEqual([]);
    expect(carrierCanvases.passes(frameAt(), 3, RANGE)).toEqual([]);
  });

  it("draws nothing while one of its two canvases has no WebGPU context", () => {
    const given = canvases(2);
    const { kit } = fakeKit([given[1]]);
    const carrierCanvases = carrierOf("page").createCanvases(given, kit);
    carrierCanvases.size(frameAt());
    expect(carrierCanvases.passes(frameAt(), 0, RANGE)).toEqual([]);
  });

  it("releases each canvas it configured", () => {
    const { given, carrierCanvases, released } = setUp("page", 2);
    carrierCanvases.release();
    expect(released).toEqual(given);
  });
});

describe("a viewport carrier", () => {
  it("draws its whole canvas over the viewport from its top edge", () => {
    const frame = frameAt({ scrollX: 20, scrollY: 500 });
    const { given, carrierCanvases } = setUp("fixed", 1, frame);
    const passes = carrierCanvases.passes(frame, 1, RANGE);

    expect(passes).toMatchObject([
      {
        surface: { canvas: given[0] },
        scissor: { x: 0, y: 0, width: 1600, height: 2000 },
        target: {
          carrier: 1,
          band: null,
          x: 20,
          y: 500,
          width: 800,
          height: 1000,
          drawnPageRange: [500, 1500],
          firstElement: 3,
          elementCount: 2,
        },
      },
    ]);
  });

  it("puts the bottom canvas's bottom edge at the viewport's bottom edge", () => {
    const frame = frameAt({ scrollY: 500, viewportBottom: 940 });
    const { carrierCanvases } = setUp("fixedBottom", 1, frame);
    expect(carrierCanvases.passes(frame, 2, RANGE)[0].target).toMatchObject({
      y: 440,
      drawnPageRange: [440, 1440],
    });
  });

  it("sizes its canvas again only for a new width, viewport height or pixel ratio", () => {
    const { carrierCanvases, sized } = setUp("fixed", 1);
    expect(sized).toMatchObject([{ width: 800, height: 1000 }]);
    carrierCanvases.size(frameAt({ scrollY: 300 }));
    expect(sized).toHaveLength(1);
    carrierCanvases.size(frameAt({ viewportHeight: 900 }));
    expect(sized).toMatchObject([{ height: 1000 }, { height: 900 }]);
  });

  it("releases its canvas", () => {
    const { given, carrierCanvases, released } = setUp("fixedBottom", 1);
    carrierCanvases.release();
    expect(released).toEqual(given);
  });
});

describe("the place of a box on a carrier", () => {
  const box: ElementBox = {
    x: 10,
    y: 20,
    width: 100,
    height: 40,
    radii: [8, 8, 8, 8],
    cornerExponent: 2,
    fill: [0, 0, 0, 0],
    grayscale: 0,
  };
  const scroller = document.createElement("div");
  const content = document.createElement("div");
  const inContent = document.createElement("div");
  const inScroller = document.createElement("div");
  scroller.append(content, inScroller);
  content.append(inContent);
  document.body.append(scroller);
  const region = {
    id: 4,
    scroller,
    content,
    parent: { kind: "page" } as const,
  };
  const context: MeasureContext = {
    ...createMeasureContext(() => 800, {
      carrierOf: () => PAGE_CARRIER,
      sticky: () => undefined,
      region: (id) => (id === 4 ? region : undefined),
      isInModalCover: () => false,
      rolesOf: () => 0,
    }),
    scrollX: 0,
    scrollY: 900,
    contentFrame: (id) =>
      id === 4
        ? { left: 0, top: -300, width: 200, height: 1000, scale: 2 }
        : null,
  };

  it.each([
    ["page", { x: 10, y: 920 }, clockAt(0, 300), { x: 10, y: 920 }],
    ["fixed", { x: 10, y: 20 }, clockAt(5, 300), { x: 15, y: 320 }],
    [
      "fixedBottom",
      { x: 10, y: -780 },
      clockAt(0, 900, 760),
      { x: 10, y: 880 },
    ],
    [
      4,
      { x: 5, y: 160, width: 50, height: 20, radii: [4, 4, 4, 4] },
      clockAt(0, 900, 0, new Map([[4, { x: 50, y: 700 }]])),
      { x: 55, y: 860 },
    ],
  ] as const)(
    "keeps a box on %s at its local place",
    (key, local, clock, page) => {
      const carrier = carrierOf(key);
      const measured = carrier.toLocal(box, context);
      expect(measured).toMatchObject(local);
      expect(
        measured === null ? null : carrier.toPage(measured, clock),
      ).toMatchObject(page);
    },
  );

  it("has no place for a box in a Scroll region whose content box has no place", () => {
    const carrier = carrierOf(9);
    expect(carrier.toLocal(box, context)).toBeNull();
    expect(carrierOf(4).toPage(box, clockAt())).toBeNull();
  });

  it("watches a box against what moves with its carrier", () => {
    const root = document.documentElement;
    expect(carrierOf("page").watchRoot(inContent, context)).toBe(root);
    expect(carrierOf("fixed").watchRoot(inContent, context)).toBeNull();
    expect(carrierOf("fixedBottom").watchRoot(inContent, context)).toBeNull();
    expect(carrierOf(4).watchRoot(inContent, context)).toBe(content);
    expect(carrierOf(4).watchRoot(inScroller, context)).toBe(scroller);
    expect(carrierOf(4).watchRoot(document.body, context)).toBe(root);
    expect(carrierOf(9).watchRoot(inContent, context)).toBe(root);
  });
});
