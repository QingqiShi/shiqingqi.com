/**
 * The `delta` of each frame of the effect layer's loop. A frame that an
 * earlier frame asked for gets the seconds since that frame, at most
 * `maxDelta`. Any other frame, the first one after the loop was idle, gets
 * 0, as the first frame of all does: an effect that starts to move then
 * takes its first step, and does not jump by the idle time.
 *
 * @internal
 */
export function createFrameClock(maxDelta: number) {
  let last: number | null = null;
  return {
    /** Starts the frame at `now`, in milliseconds, and returns its delta. */
    start(now: number) {
      const delta = last === null ? 0 : Math.min((now - last) / 1000, maxDelta);
      last = null;
      return delta;
    },
    /** The frame at `now` asks for the next frame, which follows it. */
    follow(now: number) {
      last = now;
    },
  };
}
