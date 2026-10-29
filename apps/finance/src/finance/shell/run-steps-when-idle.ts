/** Time left in the current idle period, as `requestIdleCallback` gives it. */
export interface IdleDeadlineLike {
  timeRemaining(): number;
}

type RequestIdle = (
  callback: (deadline: IdleDeadlineLike) => void,
) => () => void;

/** Another step starts in the same idle period only while this much idle time is left. */
const MIN_SLICE_MS = 8;
/** Another step starts in the same idle period only while the period's steps took less than this, so a slow device runs one step per task. */
const PERIOD_BUDGET_MS = 12;
/** Without `requestIdleCallback` (Safari): wait this long, then work for at most `FALLBACK_BUDGET_MS`. */
const FALLBACK_DELAY_MS = 50;
const FALLBACK_BUDGET_MS = 10;

/** `requestIdleCallback`, or a short timeout with a small budget where the browser has none. */
export const requestIdle: RequestIdle = (callback) => {
  if (typeof window.requestIdleCallback === "function") {
    const handle = window.requestIdleCallback(callback);
    return () => {
      window.cancelIdleCallback(handle);
    };
  }
  const timer = setTimeout(() => {
    const start = performance.now();
    callback({
      timeRemaining: () =>
        Math.max(0, FALLBACK_BUDGET_MS - (performance.now() - start)),
    });
  }, FALLBACK_DELAY_MS);
  return () => {
    clearTimeout(timer);
  };
};

/**
 * Runs `steps` in order in idle time, one or more per idle period. Each
 * step runs in one task, so keep each one short. Returns a function that
 * stops the steps that have not run.
 */
export function runStepsWhenIdle(
  steps: readonly (() => void)[],
  options: { requestIdle?: RequestIdle; onDone?: () => void } = {},
): () => void {
  const idle = options.requestIdle ?? requestIdle;
  let next = 0;
  let stopped = false;
  let cancel: (() => void) | null = null;

  const schedule = () => {
    if (stopped) return;
    if (next >= steps.length) {
      options.onDone?.();
      return;
    }
    cancel = idle(work);
  };

  const work = (deadline: IdleDeadlineLike) => {
    cancel = null;
    const start = performance.now();
    while (!stopped && next < steps.length) {
      steps[next++]();
      if (
        deadline.timeRemaining() < MIN_SLICE_MS ||
        performance.now() - start >= PERIOD_BUDGET_MS
      ) {
        break;
      }
    }
    schedule();
  };

  schedule();
  return () => {
    stopped = true;
    cancel?.();
  };
}
