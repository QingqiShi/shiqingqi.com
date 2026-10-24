import { describe, expect, it } from "vitest";
import { Spring } from "./spring.ts";

const FRAME = 1 / 60;

/** Steps the spring frame by frame, and gives each value it passes. */
function run(spring: Spring, seconds: number) {
  const values: number[] = [];
  for (let time = 0; time < seconds; time += FRAME) {
    spring.step(FRAME);
    values.push(spring.value);
  }
  return values;
}

describe("Spring", () => {
  it("settles at its target and comes to rest", () => {
    const spring = new Spring(0, { response: 0.5, damping: 1 }).to(1);
    run(spring, 2);
    expect(spring.value).toBe(1);
    expect(spring.isMoving).toBe(false);
  });

  it("overshoots its target when it is under damped, and not when it is critically damped", () => {
    const bouncy = run(
      new Spring(0, { response: 0.56, damping: 0.7 }).to(1),
      2,
    );
    const still = run(new Spring(0, { response: 0.56, damping: 1 }).to(1), 2);
    expect(Math.max(...bouncy)).toBeGreaterThan(1.02);
    expect(Math.max(...still)).toBeLessThanOrEqual(1);
  });

  it("takes about its response to come most of the way", () => {
    const spring = new Spring(0, { response: 0.5, damping: 1 }).to(1);
    run(spring, 0.5);
    expect(spring.value).toBeGreaterThan(0.9);
  });

  it("turns from where it is, at the speed it has, when the target changes", () => {
    const spring = new Spring(0, { response: 0.5, damping: 1 }).to(1);
    run(spring, 0.15);
    const { value, velocity } = spring;
    expect(velocity).toBeGreaterThan(0);
    spring.to(0);
    expect(spring.value).toBe(value);
    expect(spring.velocity).toBe(velocity);
    const after = run(spring, 0.05);
    expect(after[0]).toBeGreaterThan(value);
    run(spring, 2);
    expect(spring.value).toBe(0);
  });

  it("takes a release velocity", () => {
    const spring = new Spring(0.5, { response: 0.5, damping: 1 });
    spring.to(0, { velocity: -4 });
    expect(spring.velocity).toBe(-4);
    const [first] = run(spring, FRAME);
    expect(first).toBeLessThan(0.5);
  });

  it("waits for its delay before it moves", () => {
    const spring = new Spring(0, { response: 0.5, damping: 1 }).to(1, {
      delay: 0.1,
    });
    expect(spring.destination).toBe(1);
    run(spring, 0.08);
    expect(spring.value).toBe(0);
    expect(spring.isMoving).toBe(true);
    run(spring, 0.2);
    expect(spring.value).toBeGreaterThan(0);
  });

  it("stops at once on a snap", () => {
    const spring = new Spring(0, { response: 0.5, damping: 1 }).to(1);
    run(spring, 0.1);
    spring.snap(0.25);
    expect(spring.value).toBe(0.25);
    expect(spring.isMoving).toBe(false);
  });

  it("stays stable over a long frame", () => {
    const spring = new Spring(0, { response: 0.3, damping: 0.7 }).to(1);
    spring.step(0.5);
    expect(Number.isFinite(spring.value)).toBe(true);
    expect(Math.abs(spring.value - 1)).toBeLessThan(0.5);
  });
});
