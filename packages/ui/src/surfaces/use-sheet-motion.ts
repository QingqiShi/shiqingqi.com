import { useEffectEvent, useLayoutEffect, useRef, type RefObject } from "react";
import { useMotionEngine } from "../motion/use-motion-engine.ts";
import { createSheetMotion, type SheetMotion } from "./create-sheet-motion.ts";

/**
 * The parts of a Sheet that move.
 *
 * @internal
 */
export interface SheetParts {
  /** The card: the sheet's surface, which takes the pointer. */
  readonly cardRef: RefObject<HTMLElement | null>;
  /** The box that holds the card and what rides with it. */
  readonly moverRef: RefObject<HTMLElement | null>;
  /** The box that dims the page. */
  readonly dimRef: RefObject<HTMLElement | null>;
  /** The element that moves back while the card slides over it, or `null`. */
  readonly recede: HTMLElement | null;
}

/**
 * How a Sheet's card lifts out of an element on the page below `md`.
 *
 * @internal
 */
export interface SheetLiftOptions {
  /** The element the card lifts out of and goes back into, or `null` for the slide. */
  readonly from: () => HTMLElement | null;
  /** The parts of the card's content that fade in late as it lifts. */
  readonly contentRefs: readonly RefObject<HTMLElement | null>[];
}

/**
 * Brings a Sheet's card in while `isShown`, and takes it out when `isShown`
 * turns false, from wherever it is, as `createSheetMotion` tells. It gives
 * the motion to a drag, or `null` before the sheet mounts.
 *
 * @internal
 */
export function useSheetMotion(
  { cardRef, moverRef, dimRef, recede }: SheetParts,
  {
    isShown,
    onLeft,
    onProgress,
    lift = null,
  }: {
    isShown: boolean;
    onLeft: () => void;
    onProgress?: (progress: number) => void;
    lift?: SheetLiftOptions | null;
  },
): RefObject<SheetMotion | null> {
  const engine = useMotionEngine();
  const motionRef = useRef<SheetMotion | null>(null);
  const handleLeft = useEffectEvent(onLeft);
  const handleProgress = useEffectEvent((progress: number) => {
    onProgress?.(progress);
  });
  const findOrigin = useEffectEvent(() => lift?.from() ?? null);
  const contentOf = useEffectEvent(() =>
    (lift?.contentRefs ?? [])
      .map((ref) => ref.current)
      .filter((element) => element !== null),
  );

  useLayoutEffect(() => {
    const card = cardRef.current;
    const mover = moverRef.current;
    const dim = dimRef.current;
    if (!card || !mover || !dim) return;
    const motion = createSheetMotion(
      engine,
      { card, mover, dim, recede },
      {
        liftFrom: findOrigin,
        liftContent: contentOf,
        onLeft: handleLeft,
        onProgress: handleProgress,
      },
    );
    motionRef.current = motion;
    return () => {
      motion.destroy();
      if (motionRef.current === motion) motionRef.current = null;
    };
  }, [engine, cardRef, moverRef, dimRef, recede]);

  useLayoutEffect(() => {
    motionRef.current?.show(isShown);
  }, [isShown, engine, cardRef, moverRef, dimRef, recede]);

  return motionRef;
}
