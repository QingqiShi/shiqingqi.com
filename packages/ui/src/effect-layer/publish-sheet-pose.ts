/**
 * Where a Sheet's card is in its motion.
 *
 * @internal
 */
export type SheetPhase =
  "hidden" | "entering" | "shown" | "dragging" | "exiting";

/**
 * What a Sheet's controller tells the effect layer about its card: the
 * phase of its motion, and how far down from its rest the controller last
 * placed it, in px, which is exact while a drag holds it and stale while
 * the compositor moves it.
 *
 * @internal
 */
export interface SheetPose {
  readonly phase: SheetPhase;
  readonly y: number;
}

const poses = new WeakMap<Element, SheetPose>();

/**
 * Publishes the pose of the Sheet that `host` carries, for the Sheet edge
 * to read on its next frame. It goes through no React state: a drag
 * publishes on every move.
 *
 * @internal
 */
export function publishSheetPose(host: Element, pose: SheetPose) {
  poses.set(host, pose);
}

/**
 * The last pose published for `host`, or `null` for none.
 *
 * @internal
 */
export function readSheetPose(host: Element): SheetPose | null {
  return poses.get(host) ?? null;
}
