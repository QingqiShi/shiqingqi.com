import { px } from "@tuja/ui/motion/px";
import { springOf, springRoles } from "@tuja/ui/motion/spring-roles";
import { useBinding } from "@tuja/ui/motion/use-binding";
import {
  useMotionEngine,
  useMotionValue,
} from "@tuja/ui/motion/use-motion-engine";
import { useLayoutEffect, useRef, type RefObject } from "react";
import type { MonthKey } from "./month-bounds.ts";

/** The spring of everything that moves when the month changes. */
export const monthSpring = springOf(springRoles.move);

/** A short fade in place of a slide under reduced motion. */
const REDUCED_FADE = { duration: 0.2 };

/**
 * Slides what `ref` holds in from the side the visitor travels to when
 * `month` changes, `distance` px, as it fades in: a later month comes in
 * from the end, an earlier one from the start. A new change starts the
 * new month from that side again. Under reduced motion it only fades.
 */
export function useMonthSlide(
  ref: RefObject<HTMLElement | null>,
  month: MonthKey,
  distance: number,
) {
  const engine = useMotionEngine();
  const shift = useMotionValue(engine, 0, { precision: 0.002 });
  const fade = (at: number) => String(1 - Math.min(Math.abs(at), 1) * 0.85);
  useBinding(ref, shift, {
    pose: (at) => ({
      translate: `${px(at * distance)} 0`,
      opacity: fade(at),
    }),
    reducedPose: (at) => ({ opacity: fade(at) }),
    rest: "clear",
  });
  const shownRef = useRef(month);
  useLayoutEffect(() => {
    const shown = shownRef.current;
    if (shown === month) return;
    shownRef.current = month;
    const direction = month > shown ? 1 : -1;
    shift.to(0, {
      from: direction,
      spring: monthSpring,
      reduced: REDUCED_FADE,
    });
  }, [month, shift]);
}
