import { afterEach, expect, it, vi } from "vitest";
import { fakeMotionClock } from "../test-support/fake-motion-clock.ts";
import { createMotionEngine } from "./create-motion-engine.ts";
import { createMotionValue } from "./create-motion-value.ts";
import { createTrail } from "./create-trail.ts";

afterEach(() => {
  vi.useRealTimers();
});

it("trails its leader from where it is when the leader turns", async () => {
  const clock = fakeMotionClock();
  const engine = createMotionEngine();
  const leader = createMotionValue(engine, 0);
  const trail = createTrail(leader, { response: 0.14, dampingRatio: 0.7 });

  leader.to(1);
  await clock.advance(0.1);
  const before = {
    value: trail.value.get(),
    velocity: trail.value.getVelocity(),
  };
  expect(before.value).toBeLessThan(leader.get());

  leader.to(0);
  expect(trail.value.get()).toBe(before.value);
  expect(trail.value.getVelocity()).toBe(before.velocity);
  await clock.advance(2);
  expect(trail.value.get()).toBe(0);
  expect(trail.value.isMoving).toBe(false);
  trail.release();
});
