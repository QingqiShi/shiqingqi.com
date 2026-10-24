import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeMotionClock } from "../test-support/fake-motion-clock.ts";
import { reduceMotion } from "../test-support/reduce-motion.ts";
import { createMotionEngine } from "./create-motion-engine.ts";
import { createMotionValue } from "./create-motion-value.ts";

const FIRM = { response: 0.5, dampingRatio: 1 };

let clock: ReturnType<typeof fakeMotionClock>;

beforeEach(() => {
  clock = fakeMotionClock();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("createMotionValue", () => {
  it("springs to its target and comes to rest there", async () => {
    const engine = createMotionEngine();
    const value = createMotionValue(engine, 0, { spring: FIRM });
    const motion = value.to(1);
    expect(value.isMoving).toBe(true);
    expect(value.target).toBe(1);
    await clock.advance(0.25);
    expect(value.get()).toBeGreaterThan(0.5);
    await clock.advance(2);
    expect(value.get()).toBe(1);
    expect(value.isMoving).toBe(false);
    await expect(motion.finished).resolves.toBe(true);
  });

  it("turns from where it is, at the speed it has, when the target changes", async () => {
    const engine = createMotionEngine();
    const value = createMotionValue(engine, 0, { spring: FIRM });
    value.to(1);
    await clock.advance(0.15);
    const before = { value: value.get(), velocity: value.getVelocity() };
    expect(before.velocity).toBeGreaterThan(0);
    const first = value.to(0);
    expect(value.get()).toBe(before.value);
    expect(value.getVelocity()).toBe(before.velocity);
    await clock.advance(0.016);
    expect(value.get()).toBeGreaterThan(before.value);
    await clock.advance(2);
    expect(value.get()).toBe(0);
    await expect(first.finished).resolves.toBe(true);
  });

  it("keeps its position and velocity continuous across a retarget", async () => {
    const engine = createMotionEngine();
    const value = createMotionValue(engine, 0, {
      spring: { response: 0.4, dampingRatio: 0.7 },
    });
    value.to(100);
    await clock.advance(0.1);
    const step = 0.001;
    const just = { value: value.get(), velocity: value.getVelocity() };
    value.to(-50);
    await clock.advance(step);
    expect(value.get()).toBeCloseTo(just.value + just.velocity * step, 0);
    expect(Math.abs(value.getVelocity() - just.velocity)).toBeLessThan(
      Math.abs(just.velocity) * 0.2,
    );
  });

  it("starts at the velocity it is given", async () => {
    const engine = createMotionEngine();
    const slow = createMotionValue(engine, 300, {
      spring: FIRM,
      precision: 0.5,
    });
    const fast = createMotionValue(engine, 300, {
      spring: FIRM,
      precision: 0.5,
    });
    slow.set(300);
    fast.set(300);
    slow.to(0, { velocity: -500 });
    fast.to(0, { velocity: -3000 });
    expect(slow.getVelocity()).toBe(-500);
    expect(fast.getVelocity()).toBe(-3000);
    await clock.advance(0.048);
    expect(fast.get()).toBeLessThan(slow.get() - 50);
  });

  it("starts from another place, at the speed it has", async () => {
    const engine = createMotionEngine();
    const value = createMotionValue(engine, 0, { spring: FIRM });
    value.to(1);
    await clock.advance(0.1);
    const velocity = value.getVelocity();
    value.to(0, { from: 5 });
    expect(value.get()).toBe(5);
    expect(value.getVelocity()).toBe(velocity);
  });

  it("finishes with false when a later motion replaces it", async () => {
    const engine = createMotionEngine();
    const value = createMotionValue(engine, 0);
    const first = value.to(1);
    const second = value.to(2);
    value.set(5);
    await expect(first.finished).resolves.toBe(false);
    await expect(second.finished).resolves.toBe(false);
    expect(value.get()).toBe(5);
    expect(value.isMoving).toBe(false);
  });

  it("keeps its motion for its delay, and then turns", async () => {
    const engine = createMotionEngine();
    const value = createMotionValue(engine, 0, { spring: FIRM });
    value.to(1, { delay: 0.1 });
    expect(value.target).toBe(1);
    await clock.advance(0.08);
    expect(value.get()).toBe(0);
    expect(value.isMoving).toBe(true);
    await clock.advance(0.2);
    expect(value.get()).toBeGreaterThan(0);
  });

  it("stops where it is", async () => {
    const engine = createMotionEngine();
    const value = createMotionValue(engine, 0, { spring: FIRM });
    value.to(1);
    await clock.advance(0.1);
    const now = value.get();
    value.stop();
    await clock.advance(0.1);
    expect(value.get()).toBe(now);
  });

  it("calls a subscriber each frame while it moves, and once at rest", async () => {
    const engine = createMotionEngine();
    const value = createMotionValue(engine, 0, { spring: FIRM });
    const seen: number[] = [];
    value.subscribe((current) => seen.push(current));
    value.to(1);
    await clock.advance(3);
    const frames = seen.length;
    expect(frames).toBeGreaterThan(10);
    expect(seen.at(-1)).toBe(1);
    expect(seen.filter((current) => current === 1)).toHaveLength(1);
    await clock.advance(1);
    expect(seen).toHaveLength(frames);
    value.set(0.5);
    expect(seen.at(-1)).toBe(0.5);
  });

  it("tells the engine when its last moving value comes to rest", async () => {
    const engine = createMotionEngine();
    const a = createMotionValue(engine, 0, { spring: FIRM });
    const b = createMotionValue(engine, 0, {
      spring: { response: 1, dampingRatio: 1 },
    });
    const onRest = vi.fn();
    engine.onRest(onRest);
    a.to(1);
    b.to(1);
    await clock.advance(1);
    expect(a.isMoving).toBe(false);
    expect(onRest).not.toHaveBeenCalled();
    await clock.advance(2);
    expect(onRest).toHaveBeenCalledTimes(1);
  });

  it("snaps under reduced motion, and finishes at once", async () => {
    reduceMotion();
    const engine = createMotionEngine();
    const value = createMotionValue(engine, 0);
    const motion = value.to(1);
    expect(value.get()).toBe(1);
    expect(value.isMoving).toBe(false);
    await expect(motion.finished).resolves.toBe(true);
  });

  it("takes its reduced tween under reduced motion", async () => {
    reduceMotion();
    const engine = createMotionEngine();
    const value = createMotionValue(engine, 0);
    value.to(1, { reduced: { duration: 0.2 }, velocity: 50 });
    await clock.advance(0.1);
    expect(value.get()).toBeCloseTo(0.5, 1);
    await clock.advance(0.2);
    expect(value.get()).toBe(1);
  });

  it("stops on destroy of its engine", async () => {
    const engine = createMotionEngine();
    const value = createMotionValue(engine, 0, { spring: FIRM });
    const motion = value.to(1);
    await clock.advance(0.1);
    engine.destroy();
    await expect(motion.finished).resolves.toBe(false);
    expect(value.isMoving).toBe(false);
  });
});
