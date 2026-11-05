import { describe, expect, it } from "vitest";
import { chainedPath } from "./chained-path.ts";
import { restingPath, springPath } from "./spring-path.ts";

const FRAME = 1 / 60;
const PRECISION = 1e-3;

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

describe("chainedPath", () => {
  const leaderSpring = { response: 0.4, dampingRatio: 0.7 };
  const link = { response: 0.14, dampingRatio: 0.7 };
  const leader = springPath(
    leaderSpring,
    { value: 0, velocity: 0 },
    1,
    PRECISION,
  );

  it("starts where it is, at its speed, and comes to rest at the leader's target", () => {
    const from = { value: 0.2, velocity: -3 };
    const path = chainedPath(link, from, leader, PRECISION);

    expect(path.at(0)).toEqual(from);
    expect(path.at(1e-4).value).toBeCloseTo(from.value, 3);
    expect(path.at(1e-4).velocity).toBeCloseTo(from.velocity, 1);
    expect(path.settleTime).toBeGreaterThan(leader.settleTime);
    expect(path.at(path.settleTime)).toEqual({ value: 1, velocity: 0 });
    const end = leader.settleTime;
    expect(path.at(end - 1e-4).value).toBeCloseTo(path.at(end + 1e-4).value, 3);
  });

  it("trails a leader that moves", () => {
    const path = chainedPath(
      link,
      { value: 0, velocity: 0 },
      leader,
      PRECISION,
    );
    for (const time of [0.05, 0.1, 0.15]) {
      expect(path.at(time).value).toBeGreaterThan(0);
      expect(path.at(time).value).toBeLessThan(leader.at(time).value);
    }
  });

  it("is the spring's own path behind a leader at rest", () => {
    const from = { value: 0, velocity: 2 };
    const path = chainedPath(link, from, restingPath(1), PRECISION);
    const free = springPath(link, from, 1, PRECISION);
    for (const time of [0.02, 0.1, 0.3]) {
      expect(path.at(time)).toEqual(free.at(time));
    }
  });
});
