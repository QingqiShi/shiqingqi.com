import { describe, expect, it } from "vitest";
import {
  farthestOutlineParam,
  outlineLength,
  outlineParam,
} from "./outline-param.ts";
import {
  COMET_COUNT,
  cometCourse,
  cometStrength,
  FLOOD_SECONDS,
  floodProgressAt,
  floodRadius,
  RING_SECONDS,
  ringStart,
  sweepAt,
  sweepEnd,
} from "./sweep-at.ts";
import { sweepConsts } from "./sweep.stylex.ts";

/** A `md` Switch track on the page, below the `md` breakpoint. */
const BOX = { x: 100, y: 200, width: 96, height: 48, radius: 24 };
/** A Sweep from the thumb of an off switch. */
const FROM_THUMB = { start: 10, x: 124, y: 224 };

describe("FLOOD_SECONDS", () => {
  it("is the duration of the CSS flood", () => {
    expect(`${String(FLOOD_SECONDS * 1000)}ms`).toBe(sweepConsts.floodDuration);
  });
});

describe("floodRadius", () => {
  it("leaves fast and reaches the whole way at the end", () => {
    expect(floodRadius(0, 72)).toBe(0);
    expect(floodRadius(0.25, 72)).toBeGreaterThan(72 * 0.5);
    expect(floodRadius(1, 72)).toBe(72);
    expect(floodRadius(2, 72)).toBe(72);
  });

  it("is undone by floodProgressAt", () => {
    for (const progress of [0, 0.1, 0.4, 0.75, 1]) {
      expect(floodProgressAt(floodRadius(progress, 72), 72)).toBeCloseTo(
        progress,
      );
    }
    expect(floodProgressAt(10, 0)).toBe(0);
  });
});

describe("cometCourse and cometStrength", () => {
  it("run the whole course and end gone", () => {
    expect(cometCourse(0)).toBe(0);
    expect(cometCourse(1)).toBe(1);
    expect(cometCourse(0.3)).toBeGreaterThan(0.5);
    expect(cometStrength(0)).toBe(0);
    expect(cometStrength(0.08)).toBeGreaterThan(0.85);
    expect(cometStrength(1)).toBe(0);
  });
});

describe("ringStart", () => {
  it("is when the flood first reaches the outline", () => {
    // The thumb's centre is 24px from the cap, and the flood reaches the
    // far cap at 72px.
    const expected = FLOOD_SECONDS * (1 - Math.cbrt(1 - 24 / 72));
    expect(ringStart(FROM_THUMB, BOX)).toBeCloseTo(10 + expected);
  });

  it("is at once for a flood from the edge", () => {
    expect(ringStart({ start: 10, x: 148, y: 200 }, BOX)).toBe(10);
  });
});

describe("sweepAt", () => {
  const begin = ringStart(FROM_THUMB, BOX);
  const capTip =
    (outlineLength(BOX) / 2 + 24 + Math.PI * 12) / outlineLength(BOX);

  it("waits for the flood to reach the edge", () => {
    expect(sweepAt(FROM_THUMB, BOX, 10, false)).toEqual({
      comets: [],
      even: 0,
    });
  });

  it("starts its comets at the tip of the cap nearest the origin", () => {
    const state = sweepAt(FROM_THUMB, BOX, begin + 0.001, false);
    expect(state?.comets).toHaveLength(COMET_COUNT);
    for (const comet of state?.comets ?? []) {
      expect(comet.head).toBeCloseTo(capTip, 2);
      expect(comet.strength).toBeGreaterThan(0);
    }
  });

  it("runs the comets opposite ways to meet on the far side", () => {
    const state = sweepAt(FROM_THUMB, BOX, begin + RING_SECONDS * 0.999, false);
    const [first, second] = state?.comets ?? [];
    if (COMET_COUNT === 2) {
      expect(first.direction).toBe(1);
      expect(second.direction).toBe(-1);
      // From the left cap's tip, the far side is the right cap's tip.
      expect(first.head).toBeCloseTo(capTip + 0.5, 2);
      expect(second.head).toBeCloseTo(capTip - 0.5, 2);
    } else {
      expect(first.head - capTip).toBeCloseTo(1, 2);
    }
  });

  it("meets where the flood covers the box last", () => {
    const fromTopLeft = { start: 10, x: 130, y: 210 };
    const state = sweepAt(
      fromTopLeft,
      BOX,
      ringStart(fromTopLeft, BOX) + RING_SECONDS * 0.999,
      false,
    );
    const [first, second] = state?.comets ?? [];
    if (COMET_COUNT === 2) {
      // The far point is on the bottom-right arc, less than half way round
      // clockwise from the top edge.
      const farthest = farthestOutlineParam(BOX, 30, 10) / outlineLength(BOX);
      const around = (share: number) => ((share % 1) + 1) % 1;
      expect(around(first.head)).toBeCloseTo(farthest, 2);
      expect(around(second.head)).toBeCloseTo(farthest, 2);
      expect(
        around(first.head - outlineParam(BOX, 30, 10) / outlineLength(BOX)),
      ).toBeLessThan(0.5);
    }
  });

  it("is over after the ring's time", () => {
    expect(
      sweepAt(FROM_THUMB, BOX, begin + RING_SECONDS + 1e-6, false),
    ).toBeNull();
    expect(sweepEnd(FROM_THUMB, BOX, false)).toBeCloseTo(begin + RING_SECONDS);
  });

  it("shows a still glow for a moment under reduced motion", () => {
    const held = sweepAt(FROM_THUMB, BOX, 10.1, true);
    expect(held?.comets).toEqual([]);
    expect(held?.even).toBeGreaterThan(0);
    expect(
      sweepAt(FROM_THUMB, BOX, sweepEnd(FROM_THUMB, BOX, true) + 1e-6, true),
    ).toBeNull();
  });
});
