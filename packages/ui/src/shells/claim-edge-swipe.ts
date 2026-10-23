/**
 * How far from the inline-start edge, in px, a swipe back can start.
 *
 * @internal
 */
export const EDGE_SWIPE_ZONE = 24;

/** How far, in px, the pointer moves before the swipe decides what it is. */
const CLAIM_DISTANCE = 6;
/** A swipe faster than this, in px per ms, towards the inline end goes back. */
const POP_VELOCITY = 0.5;
/** A swipe let go past this share of the width goes back, unless it was flung back. */
const POP_SHARE = 0.4;
/** A swipe let go past `POP_SHARE` and flung back faster than this, in px per ms, stays. */
const CANCEL_VELOCITY = 0.2;

/**
 * What a pointer that went down in the edge zone does after it moved `dx`
 * and `dy` px: `"wait"` until it has moved far enough to tell, `"drag"`
 * when it moves more towards the inline end than across, and `"release"`
 * for any other move, such as a scroll.
 *
 * @internal
 */
export function claimEdgeSwipe(dx: number, dy: number) {
  if (Math.hypot(dx, dy) < CLAIM_DISTANCE) return "wait";
  return dx > 0 && dx > Math.abs(dy) ? "drag" : "release";
}

/**
 * Whether a swipe back let go `distance` px from where it started, moving at
 * `velocity` px per ms towards the inline end, over a column `width` px wide,
 * goes back: it was a flick, or it went far enough and was not flung back.
 *
 * @internal
 */
export function shouldPop(distance: number, velocity: number, width: number) {
  if (velocity > POP_VELOCITY) return true;
  return distance > width * POP_SHARE && velocity > -CANCEL_VELOCITY;
}
