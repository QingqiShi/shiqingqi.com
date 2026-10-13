import { describe, expect, it } from "vitest";
import { createFrameClock } from "./create-frame-clock.ts";

describe("createFrameClock", () => {
  it("gives the first frame no delta", () => {
    expect(createFrameClock(0.1).start(1000)).toBe(0);
  });

  it("gives a frame that follows another the seconds since it", () => {
    const clock = createFrameClock(0.1);
    clock.start(1000);
    clock.follow(1000);
    expect(clock.start(1066)).toBeCloseTo(0.066, 10);
  });

  it("gives a long frame at most the limit", () => {
    const clock = createFrameClock(0.1);
    clock.start(1000);
    clock.follow(1000);
    expect(clock.start(1500)).toBe(0.1);
  });

  it("gives the first frame after the loop was idle no delta", () => {
    const clock = createFrameClock(0.1);
    clock.start(1000);
    clock.follow(1000);
    clock.start(1016);
    expect(clock.start(5000)).toBe(0);
    clock.follow(5000);
    expect(clock.start(5016)).toBeCloseTo(0.016, 10);
  });
});
