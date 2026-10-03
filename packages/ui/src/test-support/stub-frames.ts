import { vi } from "vitest";

/**
 * Replaces `requestAnimationFrame` with a queue that `run` empties, one frame
 * per call. Call `vi.unstubAllGlobals()` after the test.
 *
 * @internal
 */
export function stubFrames() {
  let callbacks = new Map<number, FrameRequestCallback>();
  let nextId = 1;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    const id = nextId++;
    callbacks.set(id, callback);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => {
    callbacks.delete(id);
  });
  return {
    /** How many frames are requested. */
    pending: () => callbacks.size,
    run(now = 0) {
      const current = callbacks;
      callbacks = new Map();
      for (const callback of current.values()) {
        callback(now);
      }
    },
  };
}
