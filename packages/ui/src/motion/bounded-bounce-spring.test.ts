import { describe, expect, it } from "vitest";
import { boundedBounceSpring } from "./bounded-bounce-spring.ts";
import { springPath, type MotionState } from "./spring-path.ts";
import { springOf, springRoles, type Spring } from "./spring-roles.ts";

const ROLE = springOf(springRoles.move);
const BOUNCE = 3;

function farthestPast(
  spring: Spring,
  { from, target }: { from: MotionState; target: number },
) {
  const path = springPath(spring, from, target, 1e-3);
  const side = Math.sign(from.value - target) || Math.sign(from.velocity);
  let most = 0;
  for (let time = 0; time < path.settleTime; time += 1 / 4000) {
    most = Math.max(most, -side * (path.at(time).value - target));
  }
  return most;
}

describe("boundedBounceSpring", () => {
  it("keeps a far jump within the bounce", () => {
    const leg = { from: { value: 0, velocity: 0 }, target: 400 };
    expect(farthestPast(ROLE, leg)).toBeGreaterThan(BOUNCE);
    const spring = boundedBounceSpring(ROLE, [leg], BOUNCE);
    expect(farthestPast(spring, leg)).toBeLessThanOrEqual(BOUNCE + 0.01);
  });

  it("keeps the role's spring for a near jump", () => {
    const leg = { from: { value: 0, velocity: 0 }, target: 10 };
    expect(boundedBounceSpring(ROLE, [leg], BOUNCE)).toBe(ROLE);
  });

  it("keeps every leg of an interrupted travel within the bounce", () => {
    const legs = [
      { from: { value: 120, velocity: 1500 }, target: 300 },
      { from: { value: 40, velocity: -200 }, target: 0 },
      { from: { value: 300, velocity: 900 }, target: 100 },
    ];
    const spring = boundedBounceSpring(ROLE, legs, BOUNCE);
    for (const leg of legs) {
      expect(farthestPast(spring, leg)).toBeLessThanOrEqual(BOUNCE + 0.01);
    }
  });
});
