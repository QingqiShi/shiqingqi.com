import {
  AHEAD_SHARE,
  GUARD_CAP_SHARE,
  GUARD_FLOOR_CSS_PX,
  GUARD_LEAD_S,
  GUARD_SHARE,
} from "./constants.ts";
import { snapToDevicePx } from "./snap-to-device-px.ts";
import type { Motion } from "./track-motion.ts";

export interface PlanBandTopInput {
  /** Where the band starts in the document, or `null` before it is placed. */
  top: number | null;
  height: number;
  largeViewport: number;
  /** The height of the flow content the band has to stay inside. */
  docHeight: number;
  scrollY: number;
  motion: Motion;
  scale: number;
}

/**
 * How near the visible area may come to the leading band edge before the band
 * moves: a share of the spare height, never less than a floor or than the
 * distance the present speed covers before the main thread can answer, and
 * capped so the move it starts puts the visible area back outside it.
 */
export function bandGuard(spare: number, speed: number) {
  return Math.min(
    spare * GUARD_CAP_SHARE,
    Math.max(spare * GUARD_SHARE, GUARD_FLOOR_CSS_PX, speed * GUARD_LEAD_S),
  );
}

/**
 * Where the band starts in the document. It is the current top until the
 * visible area comes within the guard of the edge the scroll travels towards;
 * then most of the spare height goes ahead of the scroll.
 */
export function planBandTop({
  top,
  height,
  largeViewport,
  docHeight,
  scrollY,
  motion,
  scale,
}: PlanBandTopInput) {
  const current = top ?? 0;
  const maxTop = Math.max(0, docHeight - height);
  const spare = Math.max(0, height - largeViewport);
  const guard = bandGuard(spare, motion.speed);
  // A rubber band takes the visible area outside the document. The band stays
  // inside the document, where the reader comes back to.
  const visibleTop = Math.min(
    Math.max(scrollY, 0),
    Math.max(0, docHeight - largeViewport),
  );
  // The edge behind the scroll does not start a move. If it did, the move for
  // one edge could start a move for the other edge.
  const topGuard = motion.dir > 0 ? 0 : guard;
  const bottomGuard = motion.dir < 0 ? 0 : guard;
  const nearTop = visibleTop < current + topGuard && current > 0;
  const nearBottom =
    visibleTop + largeViewport > current + height - bottomGuard &&
    current < maxTop;
  if (top !== null && !nearTop && !nearBottom) return top;
  const ahead = motion.dir === 0 ? 0.5 : AHEAD_SHARE;
  const behind = motion.dir < 0 ? spare * ahead : spare * (1 - ahead);
  return snapToDevicePx(
    Math.min(maxTop, Math.max(0, visibleTop - behind)),
    scale,
  );
}
