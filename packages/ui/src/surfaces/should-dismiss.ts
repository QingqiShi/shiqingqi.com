/** A drag down faster than this, in px per ms, closes the sheet. */
const DISMISS_VELOCITY = 0.5;

/** A drag down further than this share of the sheet's height closes it. */
const DISMISS_SHARE = 0.3;
/** The least and the most distance, in px, that closes the sheet. */
const DISMISS_DISTANCE_MIN = 48;
const DISMISS_DISTANCE_MAX = 160;
/** A flick closes the sheet only after the sheet has moved this far, in px. */
const FLICK_DISTANCE_MIN = 12;
/** How far, in px, a drag up can move the sheet at most. */
const RUBBER_BAND_REACH = 64;
/** The span, in ms, of the samples the release velocity is read from. */
const VELOCITY_WINDOW = 100;

/**
 * One reading of a drag: when it was, in ms, and where the pointer was, in
 * px.
 *
 * @internal
 */
export interface DragSample {
  readonly time: number;
  readonly y: number;
}

/**
 * Where the sheet goes for a drag of `offset` px: down, it follows the
 * pointer; up, it resists more the further it goes, and never passes
 * `RUBBER_BAND_REACH`.
 *
 * @internal
 */
export function rubberBand(offset: number) {
  if (offset >= 0) return offset;
  const pull = -offset;
  return -(RUBBER_BAND_REACH * pull) / (RUBBER_BAND_REACH + pull);
}

/**
 * The distance, in px, that a drag down must pass to close a sheet `height`
 * px tall.
 *
 * @internal
 */
export function dismissDistance(height: number) {
  return Math.min(
    DISMISS_DISTANCE_MAX,
    Math.max(DISMISS_DISTANCE_MIN, height * DISMISS_SHARE),
  );
}

/**
 * The velocity of a drag let go at `now`, in px per ms, down positive, read
 * across the samples of the `VELOCITY_WINDOW` ms before `now`. A pointer
 * that stopped before it let go has a speed that falls to 0 over that span.
 * 0 with no sample in the span.
 *
 * @internal
 */
export function releaseVelocity(samples: readonly DragSample[], now: number) {
  const last = samples.at(-1);
  if (!last) return 0;
  let first = last;
  for (let index = samples.length - 2; index >= 0; index--) {
    const sample = samples[index];
    if (now - sample.time > VELOCITY_WINDOW) break;
    first = sample;
  }
  const elapsed = now - first.time;
  if (elapsed <= 0) return 0;
  return (last.y - first.y) / elapsed;
}

/**
 * Whether a drag that let go at `offset` px, moving at `velocity` px per ms,
 * closes a sheet `height` px tall: it went far enough down, or it was a flick
 * down. A flick up keeps it open, however far it went.
 *
 * @internal
 */
export function shouldDismiss(
  offset: number,
  velocity: number,
  height: number,
) {
  if (offset <= 0 || velocity < -DISMISS_VELOCITY) return false;
  if (offset >= dismissDistance(height)) return true;
  return offset >= FLICK_DISTANCE_MIN && velocity >= DISMISS_VELOCITY;
}

/**
 * Where a drag on the sheet went down: the grabber, the top row with the
 * title and the close button, or the content below it.
 *
 * @internal
 */
export type DragStart = "grabber" | "top-row" | "content";

/**
 * What a pointer that went down on `start` does once it has moved `dx`, `dy`
 * px, down positive, while the content is scrolled `scrollTop` px: `"wait"`
 * for a move, `"drag"` to take the sheet with it, or `"release"` to leave the
 * gesture to the browser.
 *
 * On the grabber and the top row, any move that is more vertical than
 * horizontal drags. On the content, only a move down drags, and only while
 * the content is at its top, so that anywhere else the content scrolls.
 *
 * @internal
 */
export function claimGesture(
  start: DragStart,
  dx: number,
  dy: number,
  scrollTop: number,
) {
  if (dx === 0 && dy === 0) return "wait";
  if (start !== "content") {
    return Math.abs(dy) > Math.abs(dx) ? "drag" : "release";
  }
  if (scrollTop > 0) return "release";
  return dy > Math.abs(dx) ? "drag" : "release";
}
