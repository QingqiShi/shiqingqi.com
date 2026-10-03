import { describe, expect, it } from "vitest";
import { edgesMatch, moveRootMargin, moveThresholds } from "./observe-move.ts";

const edges = (left: number, top: number, right: number, bottom: number) => ({
  left,
  top,
  right,
  bottom,
});

describe("moveRootMargin", () => {
  it("shrinks the root to the element, top first and clockwise", () => {
    expect(moveRootMargin(edges(10, 20, 110, 70), edges(0, 0, 800, 600))).toBe(
      "-20px -690px -530px -10px",
    );
  });

  it("measures from the root's own edges when the root has moved", () => {
    // The root element after a window scroll of 300px.
    expect(
      moveRootMargin(edges(10, 20, 110, 70), edges(0, -300, 800, 2700)),
    ).toBe("-320px -690px -2630px -10px");
  });

  it("rounds each edge out, so the root still holds the element", () => {
    expect(
      moveRootMargin(edges(10.75, 20.25, 110.5, 70.5), edges(0, 0, 800, 600)),
    ).toBe("-20px -689px -529px -10px");
  });

  it("grows the root past an edge the element sticks out of", () => {
    expect(
      moveRootMargin(edges(-40.5, -10, 860, 70), edges(0, 0, 800, 600)),
    ).toBe("10px 60px -530px 41px");
  });
});

describe("moveThresholds", () => {
  it("reports any change from a whole element", () => {
    expect(moveThresholds(1)).toEqual([0.999, 1]);
  });

  it("brackets the ratio of a clipped element, both ways", () => {
    const [low, high] = moveThresholds(0.5);
    expect(low).toBeLessThan(0.5);
    expect(high).toBeGreaterThan(0.5);
  });

  it("reports an element that shows again after an ancestor hid it", () => {
    expect(moveThresholds(0)).toEqual([0, 0.001]);
  });
});

describe("edgesMatch", () => {
  it("matches a box with the root rounded out around it", () => {
    expect(
      edgesMatch(edges(10.75, 20.25, 110.5, 70.5), edges(10, 20, 111, 71)),
    ).toBe(true);
  });

  it("does not match a box that moved by more than a px", () => {
    expect(edgesMatch(edges(10, 22.5, 110, 72.5), edges(10, 20, 110, 70))).toBe(
      false,
    );
  });

  it("does not match a box that grew on one side", () => {
    expect(edgesMatch(edges(10, 20, 140, 70), edges(10, 20, 110, 70))).toBe(
      false,
    );
  });
});
