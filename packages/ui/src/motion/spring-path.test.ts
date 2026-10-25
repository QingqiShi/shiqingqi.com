import { describe, expect, it } from "vitest";
import {
  afterDelay,
  restingPath,
  springPath,
  tweenPath,
  type MotionPath,
} from "./spring-path.ts";

const FRAME = 1 / 60;
const PRECISION = 1e-3;

/** The values of `path` at each frame for `seconds`. */
function framesOf(path: MotionPath, seconds: number) {
  const values: number[] = [];
  for (let time = FRAME; time <= seconds + 1e-9; time += FRAME) {
    values.push(path.at(time).value);
  }
  return values;
}

describe("springPath", () => {
  it("settles at its target and comes to rest", () => {
    const path = springPath(
      { response: 0.5, dampingRatio: 1 },
      { value: 0, velocity: 0 },
      1,
      PRECISION,
    );
    expect(path.at(2)).toEqual({ value: 1, velocity: 0 });
    expect(path.settleTime).toBeLessThan(2);
  });

  it("overshoots its target when it is under damped, and not when it is critically damped", () => {
    const start = { value: 0, velocity: 0 };
    const bouncy = springPath(
      { response: 0.56, dampingRatio: 0.7 },
      start,
      1,
      PRECISION,
    );
    const still = springPath(
      { response: 0.56, dampingRatio: 1 },
      start,
      1,
      PRECISION,
    );
    expect(Math.max(...framesOf(bouncy, 2))).toBeGreaterThan(1.02);
    expect(Math.max(...framesOf(still, 2))).toBeLessThanOrEqual(1);
  });

  it("takes about its response to come most of the way", () => {
    const path = springPath(
      { response: 0.5, dampingRatio: 1 },
      { value: 0, velocity: 0 },
      1,
      PRECISION,
    );
    expect(path.at(0.5).value).toBeGreaterThan(0.9);
  });

  it("is exact at any time, also after a long frame", () => {
    const path = springPath(
      { response: 0.3, dampingRatio: 0.7 },
      { value: 0, velocity: 0 },
      1,
      PRECISION,
    );
    const { value } = path.at(0.5);
    expect(Number.isFinite(value)).toBe(true);
    expect(Math.abs(value - 1)).toBeLessThan(0.5);
  });

  it.each([
    ["under damped", { response: 0.56, dampingRatio: 0.7 }],
    ["critically damped", { response: 0.5, dampingRatio: 1 }],
    ["over damped", { response: 0.4, dampingRatio: 1.6 }],
  ])(
    "solves the spring's equation of motion, %s",
    (_name, { response, dampingRatio }) => {
      const stiffness = ((2 * Math.PI) / response) ** 2;
      const friction = (4 * Math.PI * dampingRatio) / response;
      const steps = 40;
      const step = FRAME / steps;
      let value = 0.2;
      let velocity = 3;
      const path = springPath(
        { response, dampingRatio },
        { value, velocity },
        1,
        PRECISION,
      );
      for (let time = FRAME; time < 1; time += FRAME) {
        for (let index = 0; index < steps; index++) {
          velocity += (-stiffness * (value - 1) - friction * velocity) * step;
          value += velocity * step;
        }
        expect(path.at(time).value).toBeCloseTo(value, 2);
        expect(path.at(time).velocity).toBeCloseTo(velocity, 1);
      }
    },
  );

  it("rests once it can no longer move further than its precision, and stays there", () => {
    const spring = { response: 0.4, dampingRatio: 0.6 };
    const path = springPath(spring, { value: 0, velocity: 0 }, 400, 0.5);
    const omega = (2 * Math.PI) / spring.response;
    const reach = (time: number) => {
      const { value, velocity } = path.at(time);
      return Math.hypot(value - 400, velocity / omega);
    };
    expect(reach(path.settleTime - 1e-3)).toBeGreaterThan(0.5);
    for (let time = path.settleTime - 1e-3; time > 0; time -= 0.01) {
      expect(reach(time)).toBeGreaterThan(0.5);
    }
    const tail = framesOf(
      springPath(spring, { value: 0, velocity: 0 }, 400, 1e-9),
      path.settleTime + 1,
    ).slice(Math.floor(path.settleTime / FRAME));
    for (const value of tail) {
      expect(Math.abs(value - 400)).toBeLessThanOrEqual(0.5);
    }
  });

  it("takes its length from its spring and its distance, and needs no duration", () => {
    const spring = { response: 0.5, dampingRatio: 0.9 };
    const near = springPath(spring, { value: 0, velocity: 0 }, 10, 0.5);
    const far = springPath(spring, { value: 0, velocity: 0 }, 1000, 0.5);
    const firm = springPath(
      { response: 0.25, dampingRatio: 0.9 },
      { value: 0, velocity: 0 },
      1000,
      0.5,
    );
    expect(far.settleTime).toBeGreaterThan(near.settleTime);
    expect(firm.settleTime).toBeLessThan(far.settleTime);
  });

  it("starts at the velocity it is given, so a faster release takes another path", () => {
    const spring = { response: 0.5, dampingRatio: 1 };
    const slow = springPath(spring, { value: 300, velocity: -500 }, 0, 0.5);
    const fast = springPath(spring, { value: 300, velocity: -3000 }, 0, 0.5);
    expect(slow.at(0).velocity).toBe(-500);
    expect(fast.at(0).velocity).toBe(-3000);
    expect(fast.at(0.05).value).toBeLessThan(slow.at(0.05).value - 50);
    expect(fast.settleTime).not.toBeCloseTo(slow.settleTime, 2);
  });

  it("is at rest at once when it starts at its target", () => {
    const path = springPath(
      { response: 0.5, dampingRatio: 1 },
      { value: 1, velocity: 0 },
      1,
      PRECISION,
    );
    expect(path.settleTime).toBe(0);
  });

  it("refuses a spring with no damping, which never comes to rest", () => {
    expect(() =>
      springPath(
        { response: 0.5, dampingRatio: 0 },
        { value: 0, velocity: 0 },
        1,
        PRECISION,
      ),
    ).toThrow(RangeError);
  });
});

describe("tweenPath", () => {
  it("takes its duration, with the velocity of its easing", () => {
    const path = tweenPath({ duration: 0.2 }, 0, 1);
    expect(path.settleTime).toBe(0.2);
    expect(path.at(0.1).value).toBeCloseTo(0.5);
    expect(path.at(0.1).velocity).toBeCloseTo(5);
    expect(path.at(0.2)).toEqual({ value: 1, velocity: 0 });
  });

  it("is at rest at once with no duration", () => {
    expect(tweenPath({ duration: 0 }, 0, 1).at(0).value).toBe(1);
  });
});

describe("afterDelay", () => {
  it("keeps the first path for its delay, and then takes the next", () => {
    const first = restingPath(0);
    const next = springPath(
      { response: 0.5, dampingRatio: 1 },
      first.at(0.1),
      1,
      PRECISION,
    );
    const path = afterDelay(first, 0.1, next);
    expect(path.at(0.08).value).toBe(0);
    expect(path.at(0.2).value).toBeGreaterThan(0);
    expect(path.settleTime).toBeCloseTo(0.1 + next.settleTime);
  });
});
