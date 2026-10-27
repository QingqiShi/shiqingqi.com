import { describe, expect, it } from "vitest";
import { stepGlint } from "./step-glint.ts";

const FRAME = 1 / 60;
const water = (speed: number) => ({
  vx: new Float32Array([speed, speed]),
  set: 0,
});
const setting = { vx: new Float32Array([1, -2]), set: 0.7 };
const solid = { vx: new Float32Array([0, 0]), set: 1 };

describe("stepGlint", () => {
  it("grows with the speed of the water, signed by the way it moves", () => {
    const slow = stepGlint(0, water(4), FRAME, false);
    const fast = stepGlint(0, water(24), FRAME, false);
    expect(slow).toBeGreaterThan(0);
    expect(fast).toBeGreaterThan(slow);
    expect(fast).toBeLessThan(1);
    expect(stepGlint(0, water(-24), FRAME, false)).toBe(-fast);
  });

  it("keeps the fastest move while the body is water", () => {
    const fast = stepGlint(0, water(24), FRAME, false);
    expect(stepGlint(fast, water(4), FRAME, false)).toBe(fast);
    expect(stepGlint(fast, water(-4), FRAME, false)).toBe(fast);
  });

  it("holds while the body sets, whatever the slosh does", () => {
    expect(stepGlint(0.6, setting, FRAME, false)).toBe(0.6);
    expect(stepGlint(-0.6, setting, FRAME, false)).toBe(-0.6);
  });

  it("fades back to the rest look, on the same side, once the body is solid", () => {
    let lift = 0.6;
    const seen = [lift];
    for (let i = 0; i < 120 && lift !== 0; i++) {
      lift = stepGlint(lift, solid, FRAME, false);
      seen.push(lift);
    }
    expect(lift).toBe(0);
    for (let i = 1; i < seen.length; i++) {
      expect(seen[i]).toBeGreaterThanOrEqual(0);
      expect(seen[i]).toBeLessThan(seen[i - 1]);
    }
    expect(seen.length * FRAME).toBeLessThan(1.5);
  });

  it("does not lift the glint under reduced motion", () => {
    expect(stepGlint(0, water(24), FRAME, true)).toBe(0);
    expect(stepGlint(0.6, solid, FRAME, true)).toBe(0);
  });
});
