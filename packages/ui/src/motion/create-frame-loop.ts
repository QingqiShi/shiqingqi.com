/**
 * The one `requestAnimationFrame` of a motion engine, and its clock. Each
 * frame first runs the reads queued for it, then the writes, then the tasks
 * that run every frame, so that a frame writes from the layout it read. A
 * task queued while a frame runs goes to the next frame, except a write
 * that a read queues, which this frame runs. The loop requests no frame
 * while it has no task.
 *
 * The clock tells the time that the screen shows the motion at. It can be
 * behind `performance.now()`:
 *
 * - A long task, such as a React commit, holds back the frames of the page.
 *   While the page writes the motion once a frame, the motion then goes on
 *   from the frame before and does not jump to where the time is: a frame
 *   shows at most one usual gap between frames of motion, and the first
 *   frame after a start at most 1/60 s. A page whose every frame is slow
 *   keeps to the time, because its usual gap is long.
 * - A Web Animation that starts while no motion of the loop shows on the
 *   compositor starts on the first frame that shows it, which a busy page
 *   can make late. Until the browser tells that time, the clock stays at
 *   the start. A read of the clock between frames, such as for a new
 *   target, takes the frame that gave the animation to the browser as its
 *   start, so that the motion goes on from about where the screen shows it.
 *
 * A Web Animation that plays on the compositor runs on while a long task
 * holds the page, so while one plays, the clock keeps to the time. A hidden
 * page shows no frames, so there the clock keeps to the time too, and each
 * motion comes to rest on time.
 *
 * @internal
 */
export interface FrameLoop {
  /** The time that the screen shows the motion at, in seconds, on the clock of `document.timeline`, less what the loop held back. */
  now(): number;
  /** Runs `task` once at the start of the next frame, however often it is queued. */
  read(task: () => void): void;
  /** Runs `task` once next frame, after the reads. */
  write(task: (now: number) => void): void;
  /** Runs `task` each frame, after the writes, until the returned function stops it. */
  every(task: (now: number) => void): () => void;
  /** Runs `task` once, when the clock reaches `time`, between frames. */
  at(time: number, task: () => void): () => void;
  /** Tells the loop that a motion starts now, so that the next frame shows at most 1/60 s of motion. */
  start(): void;
  /**
   * Puts `animation`, a new Web Animation of a motion from `start` to
   * `end`, on the clock. Gives the function to call when the animation
   * stops.
   */
  sync(animation: SyncedAnimation, start: number, end: number): () => void;
  /** Drops every task. The loop stays usable. */
  destroy(): void;
}

/**
 * What the clock sets of a Web Animation.
 *
 * @internal
 */
export interface SyncedAnimation {
  startTime: CSSNumberish | null;
  readonly ready: Promise<unknown>;
}

/** The most of a motion, in seconds, that the first frame after its start shows. */
const FIRST_FRAME = 1 / 60;
/** The most of a motion, in seconds, that a later frame shows, after a long frame. */
const MAX_FRAME = 1 / 30;
/** How much of each new gap between frames goes into the pace of the frames. */
const PACE_WEIGHT = 0.25;
/** How many frames the clock waits for a Web Animation to start, before it starts it. */
const START_FRAMES = 6;
/** How long, in seconds, the clock waits for a Web Animation to start while no frame comes. */
const MAX_WAIT = 0.5;

const isHidden = () =>
  typeof document !== "undefined" && document.visibilityState === "hidden";

/** @internal */
export function createFrameLoop(): FrameLoop {
  let reads = new Set<() => void>();
  let writes: ((now: number) => void)[] = [];
  const repeats = new Set<(now: number) => void>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let request = 0;
  let reading = false;

  const time = () => performance.now() / 1000;
  /** How far, in seconds, the clock is behind `time()`. It only grows. */
  let lag = 0;
  /** The last time the clock gave, so that it never goes back. */
  let last = Number.NEGATIVE_INFINITY;
  /** The time the last frame showed, while the frames show motion. */
  let shown = Number.NaN;
  let isFresh = false;
  /** The usual gap between frames, in seconds, or 0 before two frames came. */
  let pace = 0;
  /** When the last frame that ran a task of each frame came, on `time()`. */
  let lastRun = Number.NaN;
  const playing = new Set<SyncedAnimation>();
  let playedLastFrame = false;
  /** The Web Animations that wait for the browser to start them, by the time of their start. */
  const starting = new Map<SyncedAnimation, number>();
  let startAt: number | null = null;
  let startFrames = 0;
  let waitedSince = 0;
  /** The time of the frame that gave the waiting Web Animations to the browser. */
  let givenAt: number | null = null;
  let isInFrame = false;
  let frameAt = 0;

  const isOnScreen = () => playing.size > 0 || playedLastFrame;

  function limit() {
    if (startAt !== null) return startAt;
    if (repeats.size === 0 || Number.isNaN(shown) || isOnScreen()) {
      return Number.POSITIVE_INFINITY;
    }
    return shown + (isFresh ? FIRST_FRAME : Math.max(MAX_FRAME, pace));
  }

  function now() {
    if (isHidden()) {
      if (startAt !== null) begin(startAt + lag);
      shown = Number.NaN;
    }
    if (startAt !== null && time() - waitedSince > MAX_WAIT) {
      begin(givenAt ?? time());
    }
    if (givenAt !== null && !isInFrame) begin(givenAt);
    last = Math.max(last, Math.min(time() - lag, limit()));
    return last;
  }

  /** Starts each waiting Web Animation, as one that the browser started at `at`, in seconds on `time()`. */
  function begin(at: number) {
    if (startAt === null) return;
    lag = Math.max(lag, at - startAt);
    startAt = null;
    givenAt = null;
    for (const [animation, start] of starting) {
      const startTime = (start + lag) * 1000;
      if (
        typeof animation.startTime !== "number" ||
        Math.abs(animation.startTime - startTime) > 0.5
      ) {
        animation.startTime = startTime;
      }
      playing.add(animation);
    }
    starting.clear();
  }

  function leaveFrame() {
    isInFrame = false;
    if (startAt !== null) givenAt ??= frameAt;
  }

  function schedule() {
    request ||= requestAnimationFrame(run);
  }

  function run(timestamp?: number) {
    request = 0;
    const real = time();
    frameAt = timestamp === undefined ? real : Math.min(timestamp / 1000, real);
    if (startAt !== null && ++startFrames > START_FRAMES) {
      begin(givenAt ?? frameAt);
    }
    isInFrame = true;
    const frame = now();
    if (startAt === null) lag = Math.max(lag, real - frame);
    if (repeats.size > 0 && !Number.isNaN(lastRun)) {
      const gap = real - lastRun;
      pace = pace === 0 ? gap : pace + (gap - pace) * PACE_WEIGHT;
    }
    shown = frame;
    isFresh = false;
    try {
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
      for (const task of currentWrites) task(frame);
      for (const task of [...repeats]) task(frame);
    } finally {
      // A Web Animation that a task of the frame makes at the end of the
      // task also goes to the browser in this frame.
      queueMicrotask(leaveFrame);
    }
    playedLastFrame = playing.size > 0;
    if (repeats.size > 0) {
      lastRun = real;
    } else {
      lastRun = Number.NaN;
      shown = Number.NaN;
    }
    if (repeats.size > 0 || startAt !== null) schedule();
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
      const repeat = (frame: number) => {
        task(frame);
      };
      repeats.add(repeat);
      schedule();
      return () => {
        repeats.delete(repeat);
      };
    },
    at(at, task) {
      let timer: ReturnType<typeof setTimeout>;
      const arm = () => {
        timer = setTimeout(
          () => {
            timers.delete(timer);
            if (now() < at) arm();
            else task();
          },
          Math.max(1, Math.ceil((at - now()) * 1000)),
        );
        timers.add(timer);
      };
      arm();
      return () => {
        clearTimeout(timer);
        timers.delete(timer);
      };
    },
    start() {
      if (Number.isNaN(shown)) shown = now();
      isFresh = true;
    },
    sync(animation, start, end) {
      if (startAt === null && (isOnScreen() || isHidden())) {
        animation.startTime = (start + lag) * 1000;
        playing.add(animation);
      } else {
        // The browser starts the animation on the first frame that shows
        // it, and the clock waits at the start until then.
        if (startAt === null) {
          startAt = start;
          startFrames = 0;
          waitedSince = time();
        }
        starting.set(animation, start);
        animation.ready.then(
          () => {
            if (starting.has(animation)) {
              const { startTime } = animation;
              begin(typeof startTime === "number" ? startTime / 1000 : time());
            }
          },
          () => {},
        );
        schedule();
      }
      return () => {
        if (playing.delete(animation) && playing.size === 0) {
          // A motion that takes the place of a cut one in the same frame
          // still joins the clock. After a motion that came to its end, the
          // screen shows no motion.
          playedLastFrame = now() < end;
          if (playedLastFrame) schedule();
        }
        if (starting.delete(animation) && starting.size === 0) begin(time());
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
      playing.clear();
      starting.clear();
      startAt = null;
      givenAt = null;
      startFrames = 0;
      playedLastFrame = false;
      shown = Number.NaN;
      isFresh = false;
      pace = 0;
      lastRun = Number.NaN;
    },
  };
}
