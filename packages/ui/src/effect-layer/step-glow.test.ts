import { describe, expect, it } from "vitest";
import { fadeGlow, stepGlow, type Glow } from "./step-glow.ts";

function settle(start: Glow, target: number) {
  let glow = start;
  let peak = start.value;
  let low = start.value;
  for (let frame = 0; frame < 240; frame++) {
    const next = stepGlow(glow, target, 1 / 60);
    peak = Math.max(peak, next.value);
    low = Math.min(low, next.value);
    glow = next;
    if (next.settled) {
      return { glow, frames: frame + 1, peak, low };
    }
  }
  return { glow, frames: Number.POSITIVE_INFINITY, peak, low };
}

describe("stepGlow", () => {
  it("swells past full and settles when the lamp turns on", () => {
    const { glow, frames, peak } = settle({ value: 0, velocity: 0 }, 1);
    expect(glow).toEqual({ value: 1, velocity: 0, settled: true });
    expect(peak).toBeGreaterThan(1.02);
    expect(peak).toBeLessThan(1.15);
    expect(frames).toBeLessThan(60);
  });

  it("dies away with no surge below off when the lamp turns off", () => {
    const { glow, frames, low } = settle({ value: 1, velocity: 0 }, 0);
    expect(glow).toEqual({ value: 0, velocity: 0, settled: true });
    expect(low).toBe(0);
    expect(frames).toBeLessThan(60);
  });

  it("reaches half brightness within a few frames", () => {
    let glow: Glow = { value: 0, velocity: 0 };
    for (let frame = 0; frame < 8; frame++) {
      glow = stepGlow(glow, 1, 1 / 60);
    }
    expect(glow.value).toBeGreaterThan(0.5);
  });

  it("stays at rest on its target", () => {
    expect(stepGlow({ value: 1, velocity: 0 }, 1, 1 / 60)).toEqual({
      value: 1,
      velocity: 0,
      settled: true,
    });
  });
});

describe("fadeGlow", () => {
  it("moves straight to the target at the rate", () => {
    expect(fadeGlow({ value: 0, velocity: 0 }, 1, 0.05, 4)).toEqual({
      value: 0.2,
      velocity: 0,
      settled: false,
    });
    expect(fadeGlow({ value: 0.9, velocity: 0 }, 1, 0.05, 4)).toEqual({
      value: 1,
      velocity: 0,
      settled: true,
    });
  });
});
