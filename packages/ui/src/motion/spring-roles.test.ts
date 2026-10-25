import { describe, expect, it } from "vitest";
import { duration, easing } from "../primitives/motion.stylex.ts";
import { springPath } from "./spring-path.ts";
import { springOf, springRoles, systemSpring } from "./spring-roles.ts";

/** The points of a `linear()` easing that gives no positions, which are then even. */
function pointsOf(linear: string) {
  const inside = /^linear\((.*)\)$/.exec(linear)?.[1];
  if (inside === undefined) throw new Error(`Not a linear() easing: ${linear}`);
  return inside.split(",").map((point) => Number(point.trim()));
}

describe("springRoles.css", () => {
  const spring = springOf(springRoles.css);

  it("is the spring that easing.spring samples over 500ms", () => {
    const points = pointsOf(easing.spring);
    const length = Number.parseFloat(duration._500) / 1000;
    const path = springPath(spring, { value: 0, velocity: 0 }, 1, 1e-6);
    points.forEach((point, index) => {
      const time = (index / (points.length - 1)) * length;
      expect(Math.abs(path.at(time).value - point)).toBeLessThan(1e-3);
    });
  });

  it("is at rest within the 500ms of a CSS transition that uses easing.spring", () => {
    const path = springPath(spring, { value: 0, velocity: 0 }, 1, 1e-3);
    expect(path.settleTime).toBeLessThanOrEqual(0.5);
  });
});

describe("springOf", () => {
  it("moves a heavier role slower, with the same bounce", () => {
    const light = springOf({ mass: 1 });
    const heavy = springOf({ mass: 4 });
    expect(heavy.response).toBeCloseTo(light.response * 2);
    expect(heavy.dampingRatio).toBe(systemSpring.dampingRatio);
    expect(light.dampingRatio).toBe(systemSpring.dampingRatio);
  });

  it.each([
    ["columnPush", 0.56, 0.7],
    ["stackPush", 0.5, 1],
    ["fold", 0.5, 0.88],
    ["flight", 0.46, 0.8],
    ["move", 0.42, 0.9],
    ["lift", 0.5, 0.86],
  ] as const)(
    "gives %s the spring it has today",
    (role, response, dampingRatio) => {
      const spring = springOf(springRoles[role]);
      expect(spring.response).toBeCloseTo(response, 3);
      expect(spring.dampingRatio).toBe(dampingRatio);
    },
  );
});
