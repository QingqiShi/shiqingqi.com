import { describe, expect, it } from "vitest";
import {
  farthestOutlineParam,
  outlineLength,
  outlineParam,
} from "./outline-param.ts";
import {
  cometCourse,
  cometStrength,
  RING_SECONDS,
  ringLightAt,
  ringLightEnd,
} from "./ring-light-at.ts";

/** A `md` Switch track on the page, below the `md` breakpoint. */
const BOX = { x: 100, y: 200, width: 96, height: 48, radius: 24 };
/** A ring light from where the liquid lands: the tip of the on cap. */
const FROM_LANDING = { start: 10, x: 196, y: 224 };

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

describe("ringLightAt", () => {
  const length = outlineLength(BOX);
  const onTip = outlineParam(BOX, 96, 24) / length;

  it("draws nothing before it starts", () => {
    expect(ringLightAt(FROM_LANDING, BOX, 9.9, false)).toEqual({
      comets: [],
      even: 0,
    });
  });

  it("starts its comets at the tip of the cap it starts from", () => {
    const state = ringLightAt(FROM_LANDING, BOX, 10.001, false);
    expect(state?.comets).toHaveLength(2);
    for (const comet of state?.comets ?? []) {
      expect(comet.head).toBeCloseTo(onTip, 2);
      expect(comet.strength).toBeGreaterThan(0);
    }
  });

  it("runs the comets opposite ways to meet on the far side", () => {
    const state = ringLightAt(
      FROM_LANDING,
      BOX,
      10 + RING_SECONDS * 0.999,
      false,
    );
    const [first, second] = state?.comets ?? [];
    expect(first.direction).toBe(1);
    expect(second.direction).toBe(-1);
    // From the on cap's tip, the far side is the off cap's tip.
    expect(first.head).toBeCloseTo(onTip + 0.5, 2);
    expect(second.head).toBeCloseTo(onTip - 0.5, 2);
  });

  it("meets at the point of the outline farthest from its start", () => {
    const fromTopLeft = { start: 10, x: 130, y: 210 };
    const state = ringLightAt(
      fromTopLeft,
      BOX,
      10 + RING_SECONDS * 0.999,
      false,
    );
    const [first, second] = state?.comets ?? [];
    const farthest = farthestOutlineParam(BOX, 30, 10) / length;
    const around = (share: number) => ((share % 1) + 1) % 1;
    expect(around(first.head)).toBeCloseTo(farthest, 2);
    expect(around(second.head)).toBeCloseTo(farthest, 2);
    expect(
      around(first.head - outlineParam(BOX, 30, 10) / length),
    ).toBeLessThan(0.5);
  });

  it("is over after the ring's time", () => {
    expect(
      ringLightAt(FROM_LANDING, BOX, 10 + RING_SECONDS + 1e-6, false),
    ).toBeNull();
    expect(ringLightEnd(FROM_LANDING, false)).toBeCloseTo(10 + RING_SECONDS);
  });

  it("shows a still glow for a moment under reduced motion", () => {
    const held = ringLightAt(FROM_LANDING, BOX, 10.1, true);
    expect(held?.comets).toEqual([]);
    expect(held?.even).toBeGreaterThan(0);
    expect(
      ringLightAt(
        FROM_LANDING,
        BOX,
        ringLightEnd(FROM_LANDING, true) + 1e-6,
        true,
      ),
    ).toBeNull();
  });
});
