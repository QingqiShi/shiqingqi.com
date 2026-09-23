import { describe, expect, it } from "vitest";
import { bandHeight, bandSpan } from "./band-span.ts";

describe("bandSpan", () => {
  it("spends the budget on two viewports on a phone", () => {
    expect(bandSpan({ viewportWidth: 430, largeViewport: 815, scale: 2 })).toBe(
      2,
    );
  });

  it("falls to the floor on a desktop, where the budget buys less", () => {
    expect(
      bandSpan({ viewportWidth: 1440, largeViewport: 900, scale: 2 }),
    ).toBe(1.5);
  });

  it("buys a longer span with a larger budget", () => {
    expect(
      bandSpan({
        viewportWidth: 430,
        largeViewport: 815,
        scale: 2,
        budgetMpx: 4.2,
      }),
    ).toBe(3);
  });

  it("never goes past four viewports", () => {
    expect(bandSpan({ viewportWidth: 320, largeViewport: 480, scale: 1 })).toBe(
      4,
    );
  });

  it("never goes under one viewport", () => {
    expect(
      bandSpan({
        viewportWidth: 3840,
        largeViewport: 20_000,
        scale: 3,
        budgetMpx: 0.1,
      }),
    ).toBe(1);
  });

  it("rounds to the nearest eighth", () => {
    for (const width of [360, 390, 412, 768, 1024, 1280, 1920]) {
      const span = bandSpan({
        viewportWidth: width,
        largeViewport: 800,
        scale: 1.5,
      });
      expect(span * 8).toBe(Math.round(span * 8));
    }
  });
});

describe("bandHeight", () => {
  it("is the span of large viewports", () => {
    expect(bandHeight(815, 2, 2, 5000)).toBe(1630);
  });

  it("shrinks to a document shorter than the span", () => {
    expect(bandHeight(815, 2, 2, 1200)).toBe(1200);
  });

  it("snaps to whole device pixels", () => {
    expect(bandHeight(800.4, 1.5, 1.5, 5000) * 1.5).toBeCloseTo(1801);
  });

  it("is at least one pixel tall", () => {
    expect(bandHeight(815, 2, 2, 0)).toBe(1);
  });
});
