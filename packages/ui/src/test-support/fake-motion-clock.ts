import { vi } from "vitest";

/**
 * Fakes the clock of a motion engine: `performance.now`, the frames and the
 * timers move only when `advance` moves them. A frame runs every 16ms. Call
 * `vi.useRealTimers()` after the test.
 *
 * @internal
 */
export function fakeMotionClock() {
  vi.useFakeTimers({
    toFake: [
      "performance",
      "requestAnimationFrame",
      "cancelAnimationFrame",
      "setTimeout",
      "clearTimeout",
    ],
  });
  return {
    /** Moves the clock on by `seconds`, and runs the frames, the timers and the promises that fall due. */
    advance: (seconds: number) => vi.advanceTimersByTimeAsync(seconds * 1000),
  };
}
