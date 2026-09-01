import { describe, expect, it } from "vitest";
import { snapToArtPixel } from "./snap-to-art-pixel";

describe("snapToArtPixel", () => {
  it("rounds 0.49 down to 0", () => {
    expect(snapToArtPixel(0.49)).toBe(0);
  });

  it("rounds 0.5 up to 1 (V8 half-up)", () => {
    expect(snapToArtPixel(0.5)).toBe(1);
  });

  it("rounds negatives toward +∞ at the half boundary (V8 behaviour)", () => {
    // V8: Math.round(-0.5) === -0 (rounds toward +∞), Math.round(-1.5) === -1.
    // Use Object.is so the -0/+0 distinction is treated as equivalent for
    // the documented semantics ("rounds toward +∞").
    expect(
      Object.is(snapToArtPixel(-0.5), -0) || snapToArtPixel(-0.5) === 0,
    ).toBe(true);
    expect(snapToArtPixel(-1.5)).toBe(-1);
  });
});
