import { describe, expect, it } from "vitest";
import {
  angleBetween,
  cssAngleToRadians,
  stepAim,
  type Aim,
} from "./step-aim.ts";

describe("cssAngleToRadians", () => {
  it("turns 0deg up and 90deg right, as linear-gradient does", () => {
    expect(cssAngleToRadians(90)).toBeCloseTo(0, 9);
    expect(cssAngleToRadians(180)).toBeCloseTo(Math.PI / 2, 9);
    expect(cssAngleToRadians(0)).toBeCloseTo(-Math.PI / 2, 9);
  });
});

describe("angleBetween", () => {
  it("takes the short way round", () => {
    expect(angleBetween(3, -3)).toBeCloseTo(2 * Math.PI - 6, 9);
    expect(angleBetween(-3, 3)).toBeCloseTo(6 - 2 * Math.PI, 9);
    expect(angleBetween(0, 1)).toBeCloseTo(1, 9);
  });
});

describe("stepAim", () => {
  function settle(start: Aim, target: number) {
    let aim = start;
    let furthest = 0;
    for (let frame = 0; frame < 240; frame++) {
      const next = stepAim(aim, target, 1 / 60);
      furthest = Math.max(furthest, angleBetween(target, next.angle) * -1);
      aim = next;
      if (next.settled) {
        return { aim, frames: frame + 1, overshoot: furthest };
      }
    }
    return { aim, frames: Number.POSITIVE_INFINITY, overshoot: furthest };
  }

  it("comes to rest on the target, overshooting a little", () => {
    const { aim, frames, overshoot } = settle({ angle: 1, velocity: 0 }, 0);
    expect(aim).toEqual({ angle: 0, velocity: 0, settled: true });
    expect(frames).toBeLessThan(90);
    // Coming down from 1, an overshoot goes below the target.
    expect(overshoot).toBeGreaterThan(0.01);
    expect(overshoot).toBeLessThan(0.1);
  });

  it("turns the short way round", () => {
    // From 3 to -3 the short way passes π, so the angle grows.
    const first = stepAim({ angle: 3, velocity: 0 }, -3, 1 / 60);
    expect(angleBetween(3, first.angle)).toBeGreaterThan(0);
  });

  it("stays put with no time", () => {
    expect(stepAim({ angle: 1, velocity: 0 }, 0, 0)).toMatchObject({
      angle: 1,
      settled: false,
    });
  });
});
