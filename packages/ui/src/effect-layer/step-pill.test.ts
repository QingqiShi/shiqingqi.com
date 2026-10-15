import { describe, expect, it } from "vitest";
import {
  PILL_MOTION,
  type PillMotion,
  pillSettled,
  pillStretch,
  restingPill,
  stepPill,
} from "./step-pill.ts";

const FRAME = 1 / 60;
const RADIUS = 16;

/**
 * Moves a pill at rest at 0 by `distance` px, frame by frame, after a
 * wind-up of `windUp` seconds, and returns where it is, in px, and its
 * stretch, at each frame.
 */
function move(
  distance: number,
  windUp: number = PILL_MOTION.windUp.seconds.pointer,
) {
  const goal = distance / RADIUS;
  const depth = PILL_MOTION.windUp.depth.pill / RADIUS;
  let motion: PillMotion = restingPill(0, 1);
  const frames: {
    time: number;
    x: number;
    deform: number;
    settled: boolean;
  }[] = [];
  for (let i = 1; i <= 60; i++) {
    const winding = (i - 1) * FRAME < windUp;
    ({ motion } = stepPill(
      motion,
      {
        goal: winding ? -depth : goal,
        span: 1,
        crouch: winding ? PILL_MOTION.windUp.crouch : 0,
        heading: 1,
      },
      FRAME,
      RADIUS,
    ));
    frames.push({
      time: i * FRAME,
      x: motion.x.value * RADIUS,
      deform: motion.deform.value,
      settled: !winding && pillSettled(motion, goal, 1, RADIUS),
    });
  }
  return frames;
}

describe("stepPill", () => {
  it("winds up away from where it goes, a little, and squashes as it does", () => {
    const frames = move(100);
    const windUp = frames.filter(
      ({ time }) => time <= PILL_MOTION.windUp.seconds.pointer,
    );
    const back = Math.min(...windUp.map(({ x }) => x));
    expect(back).toBeLessThan(-1.5);
    expect(back).toBeGreaterThan(-PILL_MOTION.windUp.depth.pill);
    expect(windUp.every(({ x }) => x <= 0)).toBe(true);
    expect(Math.min(...windUp.map(({ deform }) => deform))).toBeLessThan(-0.02);
  });

  it("starts each part of the move soft: no frame moves it much further than the one before", () => {
    const frames = move(200);
    for (let i = 2; i < frames.length; i++) {
      const step = Math.abs(frames[i].x - frames[i - 1].x);
      const before = Math.abs(frames[i - 1].x - frames[i - 2].x);
      expect(step).toBeLessThan(before + 25);
    }
  });

  it.each([100, 200])(
    "overshoots a %i px move a little and settles within 0.3 s of the press",
    (distance) => {
      const frames = move(distance);
      const over = Math.max(...frames.map(({ x }) => x)) - distance;
      expect(over).toBeGreaterThan(0.01 * distance);
      expect(over).toBeLessThan(0.04 * distance);
      const settled = frames.find(({ settled }) => settled);
      expect(settled?.time).toBeLessThanOrEqual(0.3 + 1e-9);
      expect(frames.at(-1)?.x).toBeCloseTo(distance, 1);
    },
  );

  it("stretches along its way and squashes once it has passed its goal", () => {
    const frames = move(100);
    expect(Math.max(...frames.map(({ deform }) => deform))).toBeGreaterThan(
      0.03,
    );
    const passed = frames.findIndex(({ x }) => x > 100);
    expect(
      Math.min(...frames.slice(passed).map(({ deform }) => deform)),
    ).toBeLessThan(-0.008);
    for (const { deform } of frames) {
      expect(deform).toBeLessThanOrEqual(PILL_MOTION.most);
      expect(deform).toBeGreaterThanOrEqual(-PILL_MOTION.squash);
    }
  });

  it("launches a key's move sooner than a pointer's", () => {
    const launch = (windUp: number) =>
      move(100, windUp).find(({ x }) => x > 0)?.time ?? 1;
    expect(launch(PILL_MOTION.windUp.seconds.key)).toBeLessThan(
      launch(PILL_MOTION.windUp.seconds.pointer),
    );
  });
});

describe("pillStretch", () => {
  it("narrows a stretched pill across the track, and widens a squashed one only a little", () => {
    expect(pillStretch(0.05)[1]).toBeCloseTo(1 / 1.05, 6);
    expect(pillStretch(-0.06)).toEqual([0.94, 1.03]);
  });
});
