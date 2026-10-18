import { useEffectEvent, useLayoutEffect, type RefObject } from "react";
import { breakpoints } from "../breakpoints.stylex.ts";
import { prefersReducedMotion } from "../prefers-reduced-motion.ts";
import { duration, easing } from "../primitives/motion.stylex.ts";

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
}

/**
 * Where the mover goes, and how much the page is dimmed. A pose with no
 * `transform` keeps it.
 */
interface Pose {
  readonly transform?: string;
  readonly opacity: number;
  readonly dim: number;
}

interface Timing {
  readonly duration: number;
  readonly easing: string;
}

/** A motion's timing for the transform and for the fades. */
interface Timings {
  readonly move: Timing;
  readonly fade: Timing;
}

/**
 * How the card comes and goes: below `md` it slides from below the screen,
 * from `md` up it rises a little as it grows, and under reduced motion it
 * fades in place.
 */
type Motion = "slide" | "rise" | "fade";

const WIDE_QUERY = breakpoints.md.replace("@media ", "");
const REST: Pose = { transform: "none", opacity: 1, dim: 1 };
const FADE: Timing = {
  duration: Number.parseFloat(duration._200),
  easing: easing.easeOut,
};
const SLIDE_EXIT: Timing = {
  duration: Number.parseFloat(duration._300),
  easing: easing.entrance,
};

function motionNow(): Motion {
  if (prefersReducedMotion()) return "fade";
  return window.matchMedia(WIDE_QUERY).matches ? "rise" : "slide";
}

function spring(): Timing {
  const supportsLinear =
    typeof CSS !== "undefined" &&
    typeof CSS.supports === "function" &&
    CSS.supports("animation-timing-function", easing.spring);
  return {
    duration: Number.parseFloat(duration._500),
    easing: supportsLinear ? easing.spring : easing.springFallback,
  };
}

function enterTimings(motion: Motion): Timings {
  return { move: motion === "fade" ? FADE : spring(), fade: FADE };
}

function leaveTimings(motion: Motion): Timings {
  const timing = motion === "slide" ? SLIDE_EXIT : FADE;
  return { move: timing, fade: timing };
}

/**
 * How far down, in px, the card at rest goes before it is fully below the
 * screen, when it is `offset` px down from its place now.
 *
 * @internal
 */
export function reachOf(card: HTMLElement, offset: number) {
  // `screen.height` can be larger than the screen, such as in a split view.
  // Then the card starts further down, which does no harm.
  const screenBottom =
    Math.max(window.visualViewport?.offsetTop ?? 0, 0) +
    Math.max(window.screen.height, window.innerHeight);
  const restTop = card.getBoundingClientRect().top - offset;
  return Math.max(screenBottom - restTop, card.offsetHeight);
}

function awayPose(motion: Motion, reach: number): Pose {
  switch (motion) {
    case "slide": {
      return {
        transform: `translateY(${String(reach)}px)`,
        opacity: 1,
        dim: 0,
      };
    }
    case "rise": {
      return { transform: "translateY(16px) scale(0.94)", opacity: 0, dim: 0 };
    }
    case "fade": {
      return { opacity: 0, dim: 0 };
    }
  }
}

function canAnimate(element: HTMLElement) {
  return typeof element.animate === "function";
}

/**
 * How far the mover is down from its place now, in px.
 *
 * @internal
 */
export function offsetOf(mover: HTMLElement) {
  const { transform } = getComputedStyle(mover);
  return transform.startsWith("matrix")
    ? new DOMMatrixReadOnly(transform).m42
    : 0;
}

/**
 * Stops the motion of each element where it is now, and keeps it there.
 *
 * @internal
 */
export function hold(...elements: HTMLElement[]) {
  for (const element of elements) {
    if (!canAnimate(element)) continue;
    for (const animation of element.getAnimations()) {
      if (element.isConnected) animation.commitStyles();
      animation.cancel();
    }
  }
}

function animateTo(
  element: HTMLElement,
  property: "opacity" | "transform",
  value: string,
  timing: Timing,
) {
  if (!canAnimate(element)) {
    element.style.setProperty(property, value);
    return [];
  }
  if (getComputedStyle(element).getPropertyValue(property) === value) return [];
  // One keyframe animates from the value that the element has now.
  return [
    element.animate([{ [property]: value }], { ...timing, fill: "forwards" }),
  ];
}

/**
 * Moves the mover and the box that dims the page from where they are to
 * `pose`, then calls `onDone`. A stop on the way does not call it.
 */
function moveTo(
  mover: HTMLElement,
  dim: HTMLElement,
  pose: Pose,
  timings: Timings,
  onDone?: () => void,
) {
  const animations = [
    ...animateTo(mover, "opacity", String(pose.opacity), timings.fade),
    ...animateTo(dim, "opacity", String(pose.dim), timings.fade),
    ...(pose.transform === undefined
      ? []
      : animateTo(mover, "transform", pose.transform, timings.move)),
  ];
  if (animations.length === 0) {
    onDone?.();
    return;
  }
  void Promise.all(animations.map(({ finished }) => finished)).then(
    () => {
      for (const animation of animations) {
        animation.commitStyles();
        animation.cancel();
      }
      onDone?.();
    },
    () => {
      // A stop cancels the motion, and the next motion takes over.
    },
  );
}

/**
 * Springs the card back to its place after a drag that does not close it.
 *
 * @internal
 */
export function settle(mover: HTMLElement, dim: HTMLElement) {
  const timing = prefersReducedMotion() ? FADE : spring();
  moveTo(mover, dim, REST, { move: timing, fade: timing });
}

/**
 * Brings a Sheet's card in while `isShown`, and takes it out when `isShown`
 * turns false, from wherever it is. Below `md` the card slides up from below
 * the bottom of the screen and slides back down to leave. From `md` up it
 * rises a little, grows and fades in. Under reduced motion it fades in and
 * out in place. The dimmed page fades in and out with it.
 *
 * @internal
 */
export function useSheetMotion(
  { cardRef, moverRef, dimRef }: SheetParts,
  { isShown, onLeft }: { isShown: boolean; onLeft: () => void },
) {
  const handleLeft = useEffectEvent(onLeft);

  useLayoutEffect(() => {
    const card = cardRef.current;
    const mover = moverRef.current;
    const dim = dimRef.current;
    if (!card || !mover || !dim) return;
    const pose = awayPose(motionNow(), reachOf(card, offsetOf(mover)));
    mover.style.opacity = String(pose.opacity);
    dim.style.opacity = String(pose.dim);
    if (pose.transform !== undefined) mover.style.transform = pose.transform;
  }, [cardRef, moverRef, dimRef]);

  useLayoutEffect(() => {
    const card = cardRef.current;
    const mover = moverRef.current;
    const dim = dimRef.current;
    if (!card || !mover || !dim) return;
    const motion = motionNow();
    if (isShown) {
      moveTo(mover, dim, REST, enterTimings(motion));
    } else {
      const away = awayPose(motion, reachOf(card, offsetOf(mover)));
      moveTo(mover, dim, away, leaveTimings(motion), handleLeft);
    }
    return () => {
      hold(mover, dim);
    };
  }, [cardRef, moverRef, dimRef, isShown]);
}
