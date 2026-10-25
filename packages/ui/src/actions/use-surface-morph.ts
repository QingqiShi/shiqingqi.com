import { useLayoutEffect, useRef, type RefObject } from "react";
import { cssSeconds, cssTween } from "../motion/css-tween.ts";
import { mix, unit } from "../motion/mix.ts";
import { px, type Styles } from "../motion/px.ts";
import { useBinding } from "../motion/use-binding.ts";
import {
  useMotionEngine,
  useMotionValue,
} from "../motion/use-motion-engine.ts";
import { duration, easing } from "../primitives/motion.stylex.ts";

/** A box relative to the frame, and its corner radius, in px. */
interface Box {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
  readonly radius: number;
}

/** The close fades the surface at its tail, so it stays visible until it is back over the trigger. */
const CLOSE_FADE = cssTween(duration._100);
const CLOSE_FADE_DELAY = cssSeconds(duration._200);
const REDUCED_FADE = cssTween(duration._150, easing.easeInOut);

function boxIn(rect: DOMRect, frame: DOMRect, radius: number): Box {
  return {
    top: rect.top - frame.top,
    left: rect.left - frame.left,
    width: rect.width,
    height: rect.height,
    radius,
  };
}

/**
 * Grows a childless surface from the trigger to the frame on open, and back on
 * close. The content stays at its final size and only fades, so a frame costs
 * the layout and the paint of one box. A toggle during a morph turns it from
 * where the surface is, at the speed it has.
 *
 * @internal
 */
export function useSurfaceMorph({
  frameRef,
  surfaceRef,
  targetId,
  isMenuShown,
}: {
  frameRef: RefObject<HTMLElement | null>;
  surfaceRef: RefObject<HTMLElement | null>;
  targetId: string;
  isMenuShown: boolean;
}) {
  const engine = useMotionEngine();
  const open = useMotionValue(engine, isMenuShown ? 1 : 0);
  const shown = useMotionValue(engine, isMenuShown ? 1 : 0);
  const boxesRef = useRef<{ trigger: Box; frame: Box } | null>(null);
  const restRadiusRef = useRef<number | null>(null);

  useBinding(surfaceRef, [open, shown], {
    // Physical properties, not logical: the morph writes measured viewport
    // coordinates, which do not flip in RTL.
    pose: (at, opacity): Styles => {
      const fade = { opacity: unit(opacity).toFixed(3) };
      const boxes = boxesRef.current;
      if (boxes === null) return fade;
      const { trigger, frame } = boxes;
      return {
        ...fade,
        top: px(mix(trigger.top, frame.top, at)),
        left: px(mix(trigger.left, frame.left, at)),
        width: px(mix(trigger.width, frame.width, at)),
        height: px(mix(trigger.height, frame.height, at)),
        "border-radius": px(Math.max(0, mix(trigger.radius, frame.radius, at))),
      };
    },
    rest: "clear",
  });

  const wasMenuShownRef = useRef(isMenuShown);
  useLayoutEffect(() => {
    if (wasMenuShownRef.current === isMenuShown) return;
    wasMenuShownRef.current = isMenuShown;
    const target = isMenuShown ? 1 : 0;

    const surface = surfaceRef.current;
    const frame = frameRef.current;
    const trigger = document.getElementById(targetId);
    if (!surface || !frame || !trigger || engine.reducedMotion) {
      // Reduced motion drops the geometry: the surface cross-fades in place.
      boxesRef.current = null;
      open.set(target);
      shown.to(target, { tween: REDUCED_FADE });
      return;
    }

    // The stylesheet's radius, read while no morph writes over it.
    if (!open.isMoving || restRadiusRef.current === null) {
      restRadiusRef.current = Number.parseFloat(
        getComputedStyle(surface).borderTopLeftRadius,
      );
    }
    const frameRect = frame.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    boxesRef.current = {
      // A pill or circle carries `corner.radius_round`, the `1e5px` sentinel
      // for `border.radius_round`. Capping it avoids the spring swinging that
      // number through zero, squaring the corners mid-morph.
      trigger: boxIn(
        triggerRect,
        frameRect,
        Math.min(
          Number.parseFloat(getComputedStyle(trigger).borderTopLeftRadius),
          Math.min(triggerRect.width, triggerRect.height) / 2,
        ),
      ),
      frame: boxIn(frameRect, frameRect, restRadiusRef.current),
    };

    if (isMenuShown) {
      shown.set(1);
      open.to(1);
      return;
    }
    open.to(0);
    shown.to(0, {
      tween: CLOSE_FADE,
      delay: CLOSE_FADE_DELAY,
    });
  }, [engine, frameRef, surfaceRef, isMenuShown, targetId, open, shown]);
}
