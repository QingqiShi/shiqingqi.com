import { describe, expect, it } from "vitest";
import {
  bandGeometry,
  bandScissorRect,
  computeBands,
  type Band,
} from "./compute-bands.ts";

// A 1000px viewport gives a 100px margin and 1200px bands.
const viewportHeight = 1000;

describe("bandGeometry", () => {
  it("adds a tenth of the viewport above and below it", () => {
    expect(bandGeometry(1000)).toEqual({
      viewport: 1000,
      margin: 100,
      bandHeight: 1200,
    });
  });

  it("rounds to whole pixels so the bands meet without a seam", () => {
    expect(bandGeometry(844.4)).toEqual({
      viewport: 844,
      margin: 85,
      bandHeight: 1014,
    });
  });
});

describe("computeBands", () => {
  it("draws only the first band at the top of a long document", () => {
    expect(
      computeBands({ scrollTop: 0, viewportHeight, documentHeight: 10_000 }),
    ).toEqual([
      {
        index: 0,
        slot: 0,
        top: 0,
        height: 1200,
        drawnTop: 0,
        drawnHeight: 1100,
      },
    ]);
  });

  it("splits the drawn range across two bands in different slots", () => {
    // Range [1400, 2600) meets band 1 [1200, 2400) and band 2 [2400, 3600).
    expect(
      computeBands({ scrollTop: 1500, viewportHeight, documentHeight: 10_000 }),
    ).toEqual([
      {
        index: 1,
        slot: 1,
        top: 1200,
        height: 1200,
        drawnTop: 200,
        drawnHeight: 1000,
      },
      {
        index: 2,
        slot: 0,
        top: 2400,
        height: 1200,
        drawnTop: 0,
        drawnHeight: 200,
      },
    ]);
  });

  it("uses one band when the drawn range matches it exactly", () => {
    expect(
      computeBands({ scrollTop: 1300, viewportHeight, documentHeight: 10_000 }),
    ).toEqual([
      {
        index: 1,
        slot: 1,
        top: 1200,
        height: 1200,
        drawnTop: 0,
        drawnHeight: 1200,
      },
    ]);
  });

  it("clips the last band at the end of the document", () => {
    // The document ends at 3000, 600px into band 2.
    expect(
      computeBands({ scrollTop: 2000, viewportHeight, documentHeight: 3000 }),
    ).toEqual([
      {
        index: 1,
        slot: 1,
        top: 1200,
        height: 1200,
        drawnTop: 700,
        drawnHeight: 500,
      },
      {
        index: 2,
        slot: 0,
        top: 2400,
        height: 600,
        drawnTop: 0,
        drawnHeight: 600,
      },
    ]);
  });

  it("clips the only band of a document shorter than the viewport", () => {
    expect(
      computeBands({ scrollTop: 0, viewportHeight, documentHeight: 400 }),
    ).toEqual([
      { index: 0, slot: 0, top: 0, height: 400, drawnTop: 0, drawnHeight: 400 },
    ]);
  });

  it("ignores an overscroll above the top of the document", () => {
    expect(
      computeBands({ scrollTop: -80, viewportHeight, documentHeight: 10_000 }),
    ).toEqual([
      {
        index: 0,
        slot: 0,
        top: 0,
        height: 1200,
        drawnTop: 0,
        drawnHeight: 1020,
      },
    ]);
  });

  it("draws nothing for an empty document", () => {
    expect(
      computeBands({ scrollTop: 0, viewportHeight, documentHeight: 0 }),
    ).toEqual([]);
  });

  it("never meets more than two bands, and never two in one slot", () => {
    for (let scrollTop = 0; scrollTop < 20_000; scrollTop += 37.5) {
      const bands = computeBands({
        scrollTop,
        viewportHeight: 873.3,
        documentHeight: 20_873,
      });
      expect(bands.length).toBeGreaterThan(0);
      expect(bands.length).toBeLessThanOrEqual(2);
      expect(new Set(bands.map((band) => band.slot)).size).toBe(bands.length);
    }
  });

  it("covers the whole visible range with no gap between the bands", () => {
    const { margin, viewport } = bandGeometry(873.3);
    for (let scrollTop = 0; scrollTop < 20_000; scrollTop += 37.5) {
      const bands = computeBands({
        scrollTop,
        viewportHeight: 873.3,
        documentHeight: 20_873,
      });
      const drawn = bands.map((band) => [
        band.top + band.drawnTop,
        band.top + band.drawnTop + band.drawnHeight,
      ]);
      expect(drawn[0]?.[0]).toBe(Math.max(0, scrollTop - margin));
      expect(drawn.at(-1)?.[1]).toBe(
        Math.min(20_873, scrollTop + viewport + margin),
      );
      if (drawn.length === 2) {
        expect(drawn[0]?.[1]).toBe(drawn[1]?.[0]);
      }
    }
  });
});

describe("bandScissorRect", () => {
  const band: Band = {
    index: 3,
    slot: 1,
    top: 3600,
    height: 1200,
    drawnTop: 100.25,
    drawnHeight: 500.5,
  };

  it("covers the drawn part in backing-store pixels", () => {
    expect(bandScissorRect(band, 2560, 2400, 1200)).toEqual({
      x: 0,
      y: 200,
      width: 2560,
      height: 1002,
    });
  });

  it("stays inside the backing store", () => {
    expect(
      bandScissorRect(
        { ...band, drawnTop: 1100, drawnHeight: 100 },
        2560,
        2399,
        1200,
      ),
    ).toEqual({ x: 0, y: 2199, width: 2560, height: 200 });
  });
});
