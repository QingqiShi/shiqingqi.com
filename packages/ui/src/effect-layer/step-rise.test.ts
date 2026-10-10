import { describe, expect, it } from "vitest";
import { stepRise, type Rise } from "./step-rise.ts";

const FRAME = 1 / 60;

function rise(from: number, goal: number, seconds: number, reduced = false) {
  const levels: number[] = [];
  let state: Rise = { level: from, speed: 0 };
  for (let frame = 0; frame < Math.round(seconds / FRAME); frame++) {
    state = stepRise(state, goal, FRAME, reduced);
    levels.push(state.level);
  }
  return levels;
}

describe("stepRise", () => {
  it("rises without overshoot, most of the way in a quarter second", () => {
    const levels = rise(0, 1, 1);
    for (const [frame, level] of levels.entries()) {
      expect(level).toBeLessThanOrEqual(1);
      expect(level).toBeGreaterThanOrEqual(levels[frame - 1] ?? 0);
    }
    expect(levels[Math.round(0.25 / FRAME)]).toBeGreaterThan(0.9);
    const done = levels.indexOf(1);
    expect(done).toBeGreaterThan(0);
    expect(done * FRAME).toBeLessThan(0.5);
  });

  it("sinks the same way", () => {
    const levels = rise(1, 0, 1);
    expect(levels[Math.round(0.25 / FRAME)]).toBeLessThan(0.1);
    expect(levels.at(-1)).toBe(0);
  });

  it("goes straight to the goal under reduced motion", () => {
    expect(rise(0, 1, FRAME, true)).toEqual([1]);
  });

  it("follows a goal that moves, with no jump", () => {
    let state: Rise = { level: 0, speed: 0 };
    let previous = 0;
    for (let frame = 0; frame < 60; frame++) {
      state = stepRise(state, frame / 60, FRAME, false);
      expect(Math.abs(state.level - previous)).toBeLessThan(0.05);
      previous = state.level;
    }
  });
});
