/**
 * The one `requestAnimationFrame` of a motion engine. Each frame first runs
 * the reads queued for it, then the writes, then the tasks that run every
 * frame, so that a frame writes from the layout it read. A task queued while
 * a frame runs goes to the next frame, except a write that a read queues,
 * which this frame runs. The loop requests no frame while it has no task.
 *
 * @internal
 */
export interface FrameLoop {
  /** The time now, in seconds, on the clock of `document.timeline`. */
  now(): number;
  /** Runs `task` once at the start of the next frame, however often it is queued. */
  read(task: () => void): void;
  /** Runs `task` once next frame, after the reads. */
  write(task: (now: number) => void): void;
  /** Runs `task` each frame, after the writes, until the returned function stops it. */
  every(task: (now: number) => void): () => void;
  /** Runs `task` once, when the clock reaches `time`, between frames. */
  at(time: number, task: () => void): () => void;
  /** Drops every task. The loop stays usable. */
  destroy(): void;
}

/** @internal */
export function createFrameLoop(): FrameLoop {
  let reads = new Set<() => void>();
  let writes: ((now: number) => void)[] = [];
  const repeats = new Set<(now: number) => void>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let request = 0;
  let reading = false;

  const now = () => performance.now() / 1000;

  function schedule() {
    request ||= requestAnimationFrame(run);
  }

  function run() {
    request = 0;
    const time = now();
    const currentReads = reads;
    reads = new Set();
    reading = true;
    try {
      for (const task of currentReads) task();
    } finally {
      reading = false;
    }
    const currentWrites = writes;
    writes = [];
    for (const task of currentWrites) task(time);
    for (const task of [...repeats]) task(time);
    if (repeats.size > 0) schedule();
  }

  return {
    now,
    read(task) {
      reads.add(task);
      schedule();
    },
    write(task) {
      writes.push(task);
      if (!reading) schedule();
    },
    every(task) {
      const repeat = (time: number) => {
        task(time);
      };
      repeats.add(repeat);
      schedule();
      return () => {
        repeats.delete(repeat);
      };
    },
    at(time, task) {
      let timer: ReturnType<typeof setTimeout>;
      const arm = () => {
        timer = setTimeout(
          () => {
            timers.delete(timer);
            if (now() < time) arm();
            else task();
          },
          Math.max(0, Math.ceil((time - now()) * 1000)),
        );
        timers.add(timer);
      };
      arm();
      return () => {
        clearTimeout(timer);
        timers.delete(timer);
      };
    },
    destroy() {
      cancelAnimationFrame(request);
      request = 0;
      reads.clear();
      writes = [];
      repeats.clear();
      for (const timer of timers) clearTimeout(timer);
      timers.clear();
    },
  };
}
