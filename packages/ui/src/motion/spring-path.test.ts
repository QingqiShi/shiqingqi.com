import { describe, expect, it } from "vitest";
import { springPath } from "./spring-path.ts";

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
