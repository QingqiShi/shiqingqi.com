import { describe, expect, it } from "vitest";
import { duration, easing } from "../primitives/motion.stylex.ts";
import { cssEasing } from "./css-easing.ts";
import { springPath } from "./spring-path.ts";
import { springOf, springRoles, systemSpring } from "./spring-roles.ts";

/** The points of a `linear()` easing that gives no positions, which are then even. */
function pointsOf(linear: string) {
  const inside = /^linear\((.*)\)$/.exec(linear)?.[1];
  if (inside === undefined) throw new Error(`Not a linear() easing: ${linear}`);
  return inside.split(",").map((point) => Number(point.trim()));
}

const LENGTH = Number.parseFloat(duration._500) / 1000;

function pathOf(role: keyof typeof springRoles, precision = 1e-6) {
  return springPath(
    springOf(springRoles[role]),
    { value: 0, velocity: 0 },
    1,
    precision,
  );
}

/** The time at which a 0 to 1 move from rest first gets 95% of the way. */
function arrivalOf(role: keyof typeof springRoles) {
  const path = pathOf(role);
  let time = 0;
  while (path.at(time).value < 0.95) time += 1e-4;
  return time;
}

describe("easing.spring", () => {
  it("is the surface spring sampled over 500ms", () => {
    const points = pointsOf(easing.spring);
    const path = pathOf("surface");
    points.forEach((point, index) => {
      const time = (index / (points.length - 1)) * LENGTH;
      expect(Math.abs(path.at(time).value - point)).toBeLessThan(1e-3);
    });
  });

  it("is at rest within the 500ms of a CSS transition that uses it", () => {
    expect(pathOf("surface", 1e-3).settleTime).toBeLessThanOrEqual(LENGTH);
  });

  it("has a fallback that stays near it", () => {
    const fallback = cssEasing(easing.springFallback);
    const path = pathOf("surface");
    for (let step = 0; step <= 50; step++) {
      const share = step / 50;
      expect(
        Math.abs(fallback(share) - path.at(share * LENGTH).value),
      ).toBeLessThan(0.05);
    }
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

  // In ms, the time each role takes to get 95% of the way.
  it.each([
    ["surface", 132],
    ["switchFill", 156],
    ["stackPush", 167],
    ["move", 177],
    ["flight", 182],
    ["columnPush", 186],
    ["lift", 186],
    ["fold", 196],
    ["aim", 204],
  ] as const)("keeps the speed of %s", (role, arrival) => {
    expect(Math.abs(arrivalOf(role) * 1000 - arrival)).toBeLessThan(4);
  });
});
