import { describe, expect, it } from "vitest";
import { outlineLength, outlineParam } from "./outline-param.ts";
import {
  cometCourse,
  cometStrength,
  LAP_SECONDS,
  ringLapAt,
  ringLapEnd,
} from "./ring-lap-at.ts";

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

describe("ringLapAt", () => {
  /** A Toast on the page: a capsule with round ends. */
  const TOAST = { x: 40, y: 600, width: 320, height: 48, radius: 24 };
  const length = outlineLength(TOAST);
  const fromStart = { start: 2, x: 40, y: 624, direction: 1 } as const;
  const onStart = outlineParam(TOAST, 0, 24) / length;

  it("draws nothing before it starts", () => {
    expect(ringLapAt(fromStart, TOAST, 1.9, false)).toEqual({
      comet: null,
      even: 0,
    });
  });

  it("starts its comet at the point nearest to its start, with no tail yet", () => {
    const comet = ringLapAt(fromStart, TOAST, 2.001, false)?.comet;
    expect(comet?.head).toBeCloseTo(onStart, 2);
    expect(comet?.tail).toBeLessThan(0.01);
    expect(comet?.strength).toBeGreaterThan(0);
  });

  it("grows its tail as it sets off, up to a share of the outline", () => {
    const early = ringLapAt(fromStart, TOAST, 2 + LAP_SECONDS * 0.02, false);
    const later = ringLapAt(fromStart, TOAST, 2 + LAP_SECONDS * 0.5, false);
    const earlyTail = early?.comet?.tail ?? 0;
    const laterTail = later?.comet?.tail ?? 0;
    expect(earlyTail).toBeGreaterThan(0);
    expect(laterTail).toBeGreaterThan(earlyTail);
    expect(laterTail).toBeLessThanOrEqual(0.35);
  });

  it("runs once all the way round, the way it is told", () => {
    const at = 2 + LAP_SECONDS * 0.999;
    const clockwise = ringLapAt(fromStart, TOAST, at, false)?.comet;
    expect(clockwise?.direction).toBe(1);
    expect(clockwise?.head).toBeCloseTo(onStart + 1, 2);
    const anticlockwise = ringLapAt(
      { ...fromStart, direction: -1 },
      TOAST,
      at,
      false,
    )?.comet;
    expect(anticlockwise?.direction).toBe(-1);
    expect(anticlockwise?.head).toBeCloseTo(onStart - 1, 2);
  });

  it("is over after the lap's time", () => {
    expect(
      ringLapAt(fromStart, TOAST, 2 + LAP_SECONDS + 1e-6, false),
    ).toBeNull();
    expect(ringLapEnd(fromStart, false)).toBeCloseTo(2 + LAP_SECONDS);
  });

  it("shows a still glow for a moment under reduced motion", () => {
    const held = ringLapAt(fromStart, TOAST, 2.1, true);
    expect(held?.comet).toBeNull();
    expect(held?.even).toBeGreaterThan(0);
    expect(
      ringLapAt(fromStart, TOAST, ringLapEnd(fromStart, true) + 1e-6, true),
    ).toBeNull();
  });
});
