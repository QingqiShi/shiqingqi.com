/**
 * The one `requestAnimationFrame` of an effect layer. Each frame first runs
 * the reads queued for it, and then draws, so that a frame draws the layout
 * it read. A read or a draw requested while a frame runs goes to the next
 * frame, except a draw that a read requests, which this frame runs.
 *
 * @internal
 */
export function createFrameScheduler() {
  let reads = new Set<() => void>();
  let draw: FrameRequestCallback | null = null;
  let request = 0;
  let reading = false;

  function schedule() {
    request ||= requestAnimationFrame(run);
  }

  function run(now: number) {
    request = 0;
    const current = reads;
    reads = new Set();
    reading = true;
    try {
      for (const read of current) {
        read();
      }
    } finally {
      reading = false;
    }
    const callback = draw;
    draw = null;
    callback?.(now);
  }

  return {
    /** Runs `read` once at the start of the next frame, however often it is queued. */
    read(read: () => void) {
      reads.add(read);
      schedule();
    },
    /** Runs `callback` next frame, after the reads. */
    draw(callback: FrameRequestCallback) {
      draw = callback;
      if (!reading) {
        schedule();
      }
    },
    destroy() {
      cancelAnimationFrame(request);
      request = 0;
      reads.clear();
      draw = null;
    },
  };
}

/** @internal */
export type FrameScheduler = ReturnType<typeof createFrameScheduler>;
