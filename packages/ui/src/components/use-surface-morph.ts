import { useLayoutEffect, useRef, type RefObject } from "react";
import {
  duration,
  easing,
  motionConstants,
} from "../primitives/motion.stylex.ts";

// Derived from the StyleX const so the JS check cannot drift from the style
// one. `matchMedia` needs the bare condition; the StyleX const carries the
// `@media ` prefix.
const REDUCED_MOTION_QUERY = motionConstants.REDUCED_MOTION.replace(
  "@media ",
  "",
);

// An empty value drops the inline override, returning the surface to the
// stylesheet's full container box. It then keeps that box if the popup
// resizes while open.
const FULL_BOX = {
  top: "",
  left: "",
  width: "",
  height: "",
  borderRadius: "",
  cornerShape: "",
};

function morphTransition(time: string, timingFunction: string) {
  // Physical properties, not logical: the morph writes measured viewport
  // coordinates, which do not flip in RTL.
  return ["top", "left", "width", "height", "border-radius"]
    .map((property) => `${property} ${time} ${timingFunction}`)
    .join(", ");
}

function setSurfaceBox(surface: HTMLElement, box: typeof FULL_BOX) {
  Object.assign(surface.style, box);
}

// React Compiler treats a bare `void element.offsetHeight` as a pure read and
// removes it. A function call is opaque to it, so this module-level wrapper
// survives compilation.
function forceReflow(element: HTMLElement) {
  void element.offsetHeight;
}

const OPEN_TRANSITION = morphTransition(duration._500, easing.spring);
const OPEN_TRANSITION_FALLBACK = morphTransition(
  duration._500,
  easing.springFallback,
);
// The fade comes at the tail, so the surface stays visible until it is back
// over the trigger.
const CLOSE_TRANSITION = `${morphTransition(duration._300, easing.entrance)}, opacity ${duration._100} ${easing.linear} ${duration._200}`;
const REDUCED_FADE = `opacity ${duration._150} ${easing.easeInOut}`;

/**
 * Grows a childless surface from the trigger to the frame on open, and back on
 * close. The content stays at its final size and only fades, so a frame costs
 * the layout and the paint of one box.
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
  const wasMenuShownRef = useRef(isMenuShown);
  useLayoutEffect(() => {
    if (wasMenuShownRef.current === isMenuShown) return;
    wasMenuShownRef.current = isMenuShown;

    const surface = surfaceRef.current;
    const frame = frameRef.current;
    const trigger = document.getElementById(targetId);
    if (!surface || !frame || !trigger) return;

    // Reduced motion drops the geometry: the surface cross-fades in place.
    if (window.matchMedia(REDUCED_MOTION_QUERY).matches) {
      surface.style.transition = "none";
      setSurfaceBox(surface, FULL_BOX);
      forceReflow(surface);
      surface.style.transition = REDUCED_FADE;
      surface.style.opacity = isMenuShown ? "1" : "0";
      return;
    }

    const frameRect = frame.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    const triggerBox = {
      top: `${String(triggerRect.top - frameRect.top)}px`,
      left: `${String(triggerRect.left - frameRect.left)}px`,
      width: `${String(triggerRect.width)}px`,
      height: `${String(triggerRect.height)}px`,
      // A pill or circle carries `corner.radius_round`, the `1e5px` sentinel
      // for `border.radius_round`. Capping it avoids the spring swinging that
      // number through zero, squaring the corners mid-morph.
      borderRadius: `min(${getComputedStyle(trigger).borderTopLeftRadius}, ${String(Math.min(triggerRect.width, triggerRect.height) / 2)}px)`,
      // The radius alone, so the surface keeps the squircle shape that
      // `popoverSurface.base` gives it.
      cornerShape: "",
    };

    if (isMenuShown) {
      surface.style.transition = "none";
      setSurfaceBox(surface, triggerBox);
      surface.style.opacity = "1";
      // Commit the trigger's box, so that the morph below starts from it.
      forceReflow(surface);

      // A browser without `linear()` rejects the second assignment, and the
      // CSSOM keeps the bezier written by the first.
      surface.style.transition = OPEN_TRANSITION_FALLBACK;
      surface.style.transition = OPEN_TRANSITION;
      setSurfaceBox(surface, FULL_BOX);
      return;
    }

    surface.style.transition = CLOSE_TRANSITION;
    setSurfaceBox(surface, triggerBox);
    surface.style.opacity = "0";
  }, [frameRef, surfaceRef, isMenuShown, targetId]);
}
