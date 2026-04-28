import { describe, expect, it } from "vitest";
import type { Clock } from "./throttle";
import { createThrottle } from "./throttle";

function createFakeClock(): Clock & {
  advance: (ms: number) => void;
  totalSlept: number;
} {
  let now = 0;
  let totalSlept = 0;

  return {
    now: () => now,
    sleep: (ms: number) => {
      now += ms;
      totalSlept += ms;
      return Promise.resolve();
    },
    advance: (ms: number) => {
      now += ms;
    },
    get totalSlept() {
      return totalSlept;
    },
  };
}

describe("TokenThrottle", () => {
  it("does not sleep when under threshold", async () => {
    const clock = createFakeClock();
    const throttle = createThrottle(clock);

    throttle.record(5_000);
    await throttle.waitIfNeeded();

    expect(clock.totalSlept).toBe(0);
  });

  it("sleeps when at or above threshold", async () => {
    const clock = createFakeClock();
    const throttle = createThrottle(clock);

    throttle.record(26_000);
    clock.advance(1_000);
    await throttle.waitIfNeeded();

    // Should sleep until the 26K entry ages out of the 60s window
    // Entry was at t=0, window expires at t=60000, clock was at t=1000
    // So sleep should be 59000ms
    expect(clock.totalSlept).toBe(59_000);
  });

  it("entries age out of the window correctly", async () => {
    const clock = createFakeClock();
    const throttle = createThrottle(clock);

    // Record tokens at different times
    throttle.record(15_000); // t=0
    clock.advance(30_000);
    throttle.record(15_000); // t=30000

    // At t=30000, total in window = 30K, above 25K threshold
    // Needs to wait until the first entry ages out at t=60001
    await throttle.waitIfNeeded();

    // Sleep until t=60000 (oldest entry at t=0 + 60000 window)
    expect(clock.totalSlept).toBe(30_000);
  });

  it("does not sleep after entries have aged out", async () => {
    const clock = createFakeClock();
    const throttle = createThrottle(clock);

    throttle.record(26_000); // t=0
    clock.advance(61_000); // t=61000, entry is now outside window

    await throttle.waitIfNeeded();
    expect(clock.totalSlept).toBe(0);
  });

  it("handles multiple small entries summing above threshold", async () => {
    const clock = createFakeClock();
    const throttle = createThrottle(clock);

    // 5 entries of 6K each = 30K total, above 25K threshold
    for (let i = 0; i < 5; i++) {
      throttle.record(6_000);
      clock.advance(1_000);
    }

    // Clock is at t=5000, entries at t=0..4000
    await throttle.waitIfNeeded();

    // Should sleep until enough entries age out to get below 25K
    // Need to drop at least 6K -> oldest entry at t=0 ages out at t=60000
    // Sleep = 60000 - 5000 = 55000
    expect(clock.totalSlept).toBe(55_000);
  });
});
