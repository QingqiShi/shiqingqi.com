import { describe, expect, it } from "vitest";
import { bandGuard, planBandTop } from "./plan-band-top.ts";
import type { Motion } from "./track-motion.ts";

const atRest: Motion = { y: 0, at: 0, speed: 0, dir: 0 };
const down: Motion = { ...atRest, dir: 1 };
const up: Motion = { ...atRest, dir: -1 };

// A phone: 815 px large viewport, a band of two viewports, 815 px spare.
const phone = {
  height: 1630,
  largeViewport: 815,
  docHeight: 5000,
  scale: 2,
};

describe("bandGuard", () => {
  it("is a quarter of the spare height", () => {
    expect(bandGuard(1630, 0)).toBe(407.5);
  });

  it("is never less than the floor", () => {
    expect(bandGuard(400, 0)).toBe(200);
  });

  it("grows with the scroll speed", () => {
    expect(bandGuard(815, 3000)).toBe(360);
  });

  it("stays under the share a move puts ahead", () => {
    expect(bandGuard(815, 10_000)).toBe(815 * 0.65);
    expect(bandGuard(0, 10_000)).toBe(0);
  });
});

describe("planBandTop", () => {
  it("centres the visible area on the first placement", () => {
    expect(
      planBandTop({ ...phone, top: null, scrollY: 2000, motion: atRest }),
    ).toBe(1593);
  });

  it("keeps the band while the visible area is outside the guard", () => {
    expect(planBandTop({ ...phone, top: 0, scrollY: 600, motion: down })).toBe(
      0,
    );
  });

  it("moves when the visible area enters the guard of the leading edge", () => {
    expect(planBandTop({ ...phone, top: 0, scrollY: 700, motion: down })).toBe(
      578,
    );
  });

  it("puts most of the spare height ahead of a scroll up", () => {
    expect(
      planBandTop({ ...phone, top: 1000, scrollY: 1100, motion: up }),
    ).toBe(407);
  });

  it("ignores the edge behind the scroll", () => {
    expect(
      planBandTop({ ...phone, top: 1000, scrollY: 1100, motion: down }),
    ).toBe(1000);
  });

  it("moves earlier when the scroll is fast", () => {
    const input = { ...phone, top: 0, scrollY: 500 };

    expect(planBandTop({ ...input, motion: down })).toBe(0);
    expect(planBandTop({ ...input, motion: { ...down, speed: 3000 } })).toBe(
      378,
    );
  });

  it("stays inside the document at its end", () => {
    expect(
      planBandTop({
        ...phone,
        docHeight: 2000,
        top: 0,
        scrollY: 1185,
        motion: down,
      }),
    ).toBe(370);
  });

  it("follows the document position in a rubber band past the end", () => {
    const input = { ...phone, docHeight: 2000, top: null, motion: atRest };

    expect(planBandTop({ ...input, scrollY: 1300 })).toBe(
      planBandTop({ ...input, scrollY: 1185 }),
    );
  });

  it("stays at the top in a rubber band above the document", () => {
    expect(
      planBandTop({ ...phone, top: null, scrollY: -120, motion: up }),
    ).toBe(0);
  });

  it("stays at the top of a document shorter than the band", () => {
    expect(
      planBandTop({
        ...phone,
        height: 600,
        docHeight: 600,
        top: null,
        scrollY: 0,
        motion: down,
      }),
    ).toBe(0);
  });

  it("snaps a move to whole device pixels", () => {
    const top = planBandTop({
      ...phone,
      scale: 1.5,
      top: null,
      scrollY: 1000,
      motion: atRest,
    });

    expect(top * 1.5).toBeCloseTo(Math.round(top * 1.5));
    expect(top).toBeCloseTo(592.5, 0);
  });
});
