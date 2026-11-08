import { describe, expect, it } from "vitest";
import { ownedStops } from "./owned-stops.ts";

// Segments that run from 0 to 3, from 3 to 6 and from 6 to 9 rest radii.
const stops = [0, 1, 2].map((index) => ({
  target: 3 * index + 1.5,
  span: 0.5,
}));

describe("ownedStops", () => {
  it("takes each segment that the liquid comes within the margin of", () => {
    expect(ownedStops(stops, [1, 1.5], null, 1)).toEqual([0, 0]);
    expect(ownedStops(stops, [1, 2.5], null, 1)).toEqual([0, 1]);
  });

  it("keeps a segment until the liquid is twice the margin from it", () => {
    expect(ownedStops(stops, [4.5, 4.8], [0, 1], 1)).toEqual([0, 1]);
    expect(ownedStops(stops, [5.5, 5.8], [0, 1], 1)).toEqual([1, 2]);
  });

  it("owns the segments between two that it takes", () => {
    expect(ownedStops(stops, [2.5, 6.5], null, 0)).toEqual([0, 2]);
  });
});
