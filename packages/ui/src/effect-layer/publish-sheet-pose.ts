/**
 * Where a Sheet's card is in its motion.
 *
 * @internal
 */
export type SheetPhase =
  "hidden" | "entering" | "shown" | "dragging" | "exiting";

/**
 * What a Sheet's controller tells the effect layer about its card: the
 * phase of its motion; how far down from its rest the controller last
 * placed it, in px, which is exact while a drag holds it and stale while
 * the compositor moves it; and, while a drag holds it, how far the finger
 * has gone from where it took hold, in CSS px, less how far it has taken
 * the card: 0 while the card follows the finger, and more as the finger
 * pulls the card past where it can go; and the Dim over the page, whose
 * colour shows past the card's top edge, or `null` for none.
 *
 * @internal
 */
export interface SheetPose {
  readonly phase: SheetPhase;
  readonly y: number;
  readonly finger: readonly [number, number] | null;
  readonly dim: Element | null;
}

const poses = new WeakMap<Element, SheetPose>();
const listeners = new Set<() => void>();

/**
 * Publishes the pose of the Sheet whose card is `card`, for an effect to
 * read on its next frame, and wakes the effects that listen. It goes
 * through no React state: a drag publishes on every move.
 *
 * @internal
 */
export function publishSheetPose(card: Element, pose: SheetPose) {
  poses.set(card, pose);
  for (const listener of listeners) listener();
}

/**
 * The last pose published for `card`, or `null` for none.
 *
 * @internal
 */
export function readSheetPose(card: Element): SheetPose | null {
  return poses.get(card) ?? null;
}

/**
 * Calls `listener` on each pose any Sheet publishes. Returns the call that
 * stops it.
 *
 * @internal
 */
export function subscribeSheetPoses(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
