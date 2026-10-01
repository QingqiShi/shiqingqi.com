import { describe, expect, it } from "vitest";
import { computePopoverPosition } from "./compute-popover-position.ts";

const VIEWPORT = { width: 1000, height: 800 };

/** A 100×20 anchor whose top-left corner is where the test says it is. */
function anchorAt(left: number, top: number, width = 100, height = 20) {
  return {
    top,
    left,
    right: left + width,
    bottom: top + height,
    width,
    height,
  };
}

function place(
  anchor: ReturnType<typeof anchorAt>,
  placement: Parameters<typeof computePopoverPosition>[0]["placement"],
  popover = { width: 200, height: 120 },
) {
  return computePopoverPosition({
    anchor,
    popover,
    placement,
    offset: 8,
    viewport: VIEWPORT,
    padding: 8,
    rtl: false,
  });
}

describe("computePopoverPosition", () => {
  it("hangs a bottom-start popover off the anchor's start edge", () => {
    const result = place(anchorAt(300, 200), "bottom-start");

    expect(result).toMatchObject({ top: 228, left: 300, side: "bottom" });
  });

  it("hangs a bottom-end popover off the anchor's end edge", () => {
    const result = place(anchorAt(300, 200), "bottom-end");

    // Anchor's right edge (400) minus the popover's width.
    expect(result.left).toBe(200);
  });

  it("centres an unaligned placement on the anchor", () => {
    const result = place(anchorAt(300, 200), "bottom");

    expect(result.left).toBe(250);
    expect(result.align).toBe("center");
  });

  it("places a top popover above the anchor", () => {
    const result = place(anchorAt(300, 400), "top-start");

    expect(result).toMatchObject({ top: 272, side: "top" });
  });

  it("puts an inline placement beside the anchor", () => {
    const right = place(anchorAt(300, 400), "right");
    expect(right).toMatchObject({ left: 408, side: "right" });

    const left = place(anchorAt(300, 400), "left");
    expect(left).toMatchObject({ left: 92, side: "left" });
  });

  it("flips to the opposite side when the preferred one would overflow", () => {
    // Anchor near the bottom edge: 720 + 20 + 8 + 120 runs past 800.
    const result = place(anchorAt(300, 720), "bottom-start");

    expect(result.side).toBe("top");
    expect(result.top).toBe(592);
  });

  it("keeps the preferred side when the opposite would overflow too", () => {
    // A popover taller than the viewport overflows either way, so flipping
    // would only trade one clipped edge for another.
    const result = place(anchorAt(300, 400), "bottom-start", {
      width: 200,
      height: 900,
    });

    expect(result.side).toBe("bottom");
  });

  it("shifts a popover back inside the viewport's inline edges", () => {
    const startEdge = place(anchorAt(2, 200), "bottom-start");
    expect(startEdge.left).toBe(8);

    const endEdge = place(anchorAt(900, 200), "bottom-start");
    expect(endEdge.left).toBe(792);
  });

  it("mirrors -start and -end alignment in RTL", () => {
    const options = {
      anchor: anchorAt(300, 200),
      popover: { width: 200, height: 120 },
      placement: "bottom-start",
      offset: 8,
      viewport: VIEWPORT,
      padding: 8,
    } as const;

    expect(computePopoverPosition({ ...options, rtl: false }).left).toBe(300);
    // Inline-start is the anchor's right edge in RTL, so the popover grows back
    // across it instead of past it.
    expect(computePopoverPosition({ ...options, rtl: true }).left).toBe(200);
  });

  it("leaves cross-axis alignment alone in RTL for inline placements", () => {
    const options = {
      anchor: anchorAt(300, 200),
      popover: { width: 200, height: 120 },
      placement: "right-start",
      offset: 8,
      viewport: VIEWPORT,
      padding: 8,
    } as const;

    expect(computePopoverPosition({ ...options, rtl: false }).top).toBe(200);
    expect(computePopoverPosition({ ...options, rtl: true }).top).toBe(200);
  });

  it("pins to the start edge when the popover is larger than the viewport", () => {
    const result = place(anchorAt(300, 200), "bottom-start", {
      width: 2000,
      height: 2000,
    });

    expect(result).toMatchObject({ top: 8, left: 8 });
  });
});
