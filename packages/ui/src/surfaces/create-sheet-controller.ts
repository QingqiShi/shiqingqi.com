import { breakpoints } from "../breakpoints.stylex.ts";
import { prefersReducedMotion } from "../prefers-reduced-motion.ts";
import { duration, easing } from "../primitives/motion.stylex.ts";
import {
  claimGesture,
  releaseVelocity,
  rubberBand,
  shouldDismiss,
  type DragSample,
  type DragStart,
} from "./should-dismiss.ts";

const WIDE_QUERY = breakpoints.md.replace("@media ", "");
const MAX_SAMPLES = 12;
const ENTER_MS = Number.parseFloat(duration._500);
const RISE_EXIT_MS = Number.parseFloat(duration._200);
const SLIDE_EXIT_MS = Number.parseFloat(duration._300);
const FADE_MS = Number.parseFloat(duration._200);
const REDUCED_SETTLE_MS = Number.parseFloat(duration._150);
const NO_DRAG = "input[type='range'], textarea, [contenteditable]";

/** How far, in px, the centred card rises as it enters. */
const RISE = 16;
/** The centred card's scale when it starts to enter and when it has left. */
const AWAY_SCALE = 0.94;

/**
 * Where the card is: down from its place, its scale, and how opaque it is.
 * The dim takes the opacity too, and fades out as the card goes down to
 * below the screen.
 */
interface Pose {
  readonly y: number;
  readonly scale: number;
  readonly fade: number;
}

/** A motion's length and curve. */
interface Timing {
  readonly duration: number;
  readonly easing: string;
}

/**
 * How the card comes and goes: below `md` it slides from below the screen,
 * from `md` up it rises a little as it grows, and under reduced motion it
 * fades in place.
 */
type Motion = "slide" | "rise" | "fade";

interface Drag {
  readonly pointerId: number;
  readonly start: DragStart;
  readonly target: Element;
  readonly startX: number;
  startY: number;
  base: number;
  isActive: boolean;
  samples: DragSample[];
}

interface SheetControllerOptions {
  /** The card: the sheet's surface, which moves. */
  readonly card: HTMLElement;
  /** The box the content scrolls in. */
  readonly scroller: () => HTMLElement | null;
  /** The grabber, which starts a drag for any pointer. */
  readonly grabber: () => HTMLElement | null;
  /**
   * The box around the close button. The top row reaches from the top of the
   * card to as far below this box as the box is below the top of the card.
   */
  readonly closeCorner: () => HTMLElement | null;
  /** The dim over the page, which fades as the card goes. */
  readonly dim: () => HTMLElement | null;
  /** A drag let go far enough or fast enough to close the sheet. */
  readonly onDismiss: () => void;
  /** The card has left the screen. */
  readonly onExited: () => void;
}

const REST: Pose = { y: 0, scale: 1, fade: 1 };

/**
 * How far the target, or the box between it and the scroller that is
 * scrolled furthest, is scrolled down, in px. Below 0 while iOS stretches it
 * past its top.
 */
function scrolledBy(target: Element, scroller: Element | null) {
  let furthest = Number.NEGATIVE_INFINITY;
  for (
    let node: Element | null = target;
    node !== null;
    node = node.parentElement
  ) {
    furthest = Math.max(furthest, node.scrollTop);
    if (node === scroller) break;
  }
  return furthest;
}

/**
 * Makes the dim as tall as the document plus one screen. The document grows
 * with it, so that Safari on iOS has page to dim under its toolbar at the end
 * of the document, and where it scrolls past that end for the keyboard.
 */
function coverDocument(dim: HTMLElement) {
  dim.style.blockSize = "0px";
  const height = document.documentElement.scrollHeight;
  dim.style.blockSize = `calc(${String(height)}px + 100lvh)`;
}

function clamp01(value: number) {
  return Math.min(Math.max(value, 0), 1);
}

function transformOf({ y, scale }: Pose) {
  if (scale === 1) return y === 0 ? "none" : `translateY(${String(y)}px)`;
  return `translateY(${String(y)}px) scale(${String(scale)})`;
}

function springEasing() {
  const supportsLinear =
    typeof CSS !== "undefined" &&
    typeof CSS.supports === "function" &&
    CSS.supports("animation-timing-function", easing.spring);
  return supportsLinear ? easing.spring : easing.springFallback;
}

function motionNow(): Motion {
  if (prefersReducedMotion()) return "fade";
  return window.matchMedia(WIDE_QUERY).matches ? "rise" : "slide";
}

/**
 * Moves a Sheet's card: in and out, the drag that closes it, and the spring
 * back when a drag does not close it. It writes the card's `transform` and
 * `opacity`, and the dim's `opacity`, straight to the DOM, so a frame of the
 * motion renders nothing.
 *
 * Below `md` the card slides up from below the bottom of the screen and
 * slides back down to leave, and the dim fades with the distance it has
 * gone. From `md` up it rises a little, grows and fades in. Under reduced
 * motion it fades in and out in place; a drag still follows the pointer.
 *
 * A drag starts below `md` only, where the card sits at the bottom of the
 * screen and a pull down reads as putting it away. Any pointer drags the
 * grabber. Only touch drags the rest of the card, so that a mouse can still
 * select text: the top row always, and the content only with a pull down
 * while it is scrolled to its top. Anywhere else, the content scrolls.
 *
 * @internal
 */
export function createSheetController(options: SheetControllerOptions) {
  const { card } = options;
  const canAnimate = typeof card.animate === "function";
  const spring: Timing = { duration: ENTER_MS, easing: springEasing() };
  const fadeTiming: Timing = { duration: FADE_MS, easing: easing.easeOut };
  const riseExit: Timing = { duration: RISE_EXIT_MS, easing: easing.easeOut };
  const slideExit: Timing = {
    duration: SLIDE_EXIT_MS,
    easing: easing.entrance,
  };
  const reducedSettle: Timing = {
    duration: REDUCED_SETTLE_MS,
    easing: easing.easeOut,
  };
  let phase: "hidden" | "entering" | "shown" | "dragging" | "exiting" =
    "hidden";
  let motion: Motion = "slide";
  let pose: Pose = REST;
  // How far down, in px, the card goes before it is fully below the screen.
  let reach = Number.POSITIVE_INFINITY;
  let animations: Animation[] = [];
  let drag: Drag | null = null;

  function measureReach() {
    if (window.matchMedia(WIDE_QUERY).matches) {
      reach = Number.POSITIVE_INFINITY;
      return;
    }
    // `screen.height` can be larger than the screen, such as in a split
    // view. Then the card starts further down, which does no harm.
    const viewport = window.visualViewport;
    const screenBottom =
      Math.max(viewport?.offsetTop ?? 0, 0) +
      Math.max(window.screen.height, window.innerHeight);
    const restTop = card.getBoundingClientRect().top - pose.y;
    reach = Math.max(screenBottom - restTop, card.offsetHeight);
  }

  function dimOpacity(at: Pose) {
    return at.fade * (1 - clamp01(at.y / reach));
  }

  /** Where the card goes to leave from `from`, and comes in from. */
  function awayFrom(from: Pose): Pose {
    switch (motion) {
      case "slide": {
        return { y: Math.max(reach, from.y), scale: 1, fade: 1 };
      }
      case "rise": {
        return { y: RISE, scale: AWAY_SCALE, fade: 0 };
      }
      case "fade": {
        return { ...from, fade: 0 };
      }
    }
  }

  function place(next: Pose) {
    pose = next;
    const transform = transformOf(next);
    card.style.transform = transform === "none" ? "" : transform;
    card.style.opacity = next.fade >= 1 ? "" : String(next.fade);
    const dim = options.dim();
    if (dim) dim.style.opacity = String(dimOpacity(next));
  }

  /** Stops the motion where it is now, and keeps the card there. */
  function stop() {
    if (animations.length === 0) return;
    const style = getComputedStyle(card);
    const matrix =
      style.transform === "" || style.transform === "none"
        ? null
        : new DOMMatrixReadOnly(style.transform);
    const fade = Number.parseFloat(style.opacity);
    for (const animation of animations) animation.cancel();
    animations = [];
    place({
      y: matrix?.m42 ?? 0,
      scale: matrix?.a ?? 1,
      fade: Number.isNaN(fade) ? 1 : fade,
    });
  }

  /** Runs the motion to `to` on the compositor, then calls `done`. */
  function moveTo(to: Pose, move: Timing, fade: Timing, done?: () => void) {
    if (!canAnimate) {
      place(to);
      done?.();
      return;
    }
    const from = pose;
    const fadeOptions = {
      duration: fade.duration,
      easing: fade.easing,
      fill: "forwards",
    } as const;
    const started: { animation: Animation; duration: number }[] = [];
    if (transformOf(from) !== transformOf(to)) {
      started.push({
        animation: card.animate(
          [{ transform: transformOf(from) }, { transform: transformOf(to) }],
          { duration: move.duration, easing: move.easing, fill: "forwards" },
        ),
        duration: move.duration,
      });
    }
    if (from.fade !== to.fade) {
      started.push({
        animation: card.animate(
          [{ opacity: from.fade }, { opacity: to.fade }],
          fadeOptions,
        ),
        duration: fade.duration,
      });
    }
    const dim = options.dim();
    if (dim && dimOpacity(from) !== dimOpacity(to)) {
      started.push({
        animation: dim.animate(
          [{ opacity: dimOpacity(from) }, { opacity: dimOpacity(to) }],
          fadeOptions,
        ),
        duration: fade.duration,
      });
    }
    const last = started.reduce<(typeof started)[number] | null>(
      (longest, entry) =>
        longest && longest.duration >= entry.duration ? longest : entry,
      null,
    );
    if (!last) {
      place(to);
      done?.();
      return;
    }
    animations = started.map(({ animation }) => animation);
    last.animation.onfinish = () => {
      place(to);
      for (const animation of animations) animation.cancel();
      animations = [];
      done?.();
    };
  }

  function markShown() {
    phase = "shown";
  }

  /** Brings the card in, from away or from where it is. */
  function show() {
    if (phase !== "hidden" && phase !== "exiting") return;
    stop();
    const isFresh = phase === "hidden";
    phase = "entering";
    motion = motionNow();
    const dim = options.dim();
    if (dim) {
      dim.style.pointerEvents = "";
      if (isFresh) coverDocument(dim);
    }
    measureReach();
    if (isFresh) place(awayFrom(REST));
    moveTo(
      REST,
      motion === "fade" ? fadeTiming : spring,
      fadeTiming,
      markShown,
    );
  }

  /** Takes the card out from where it is, then calls `onExited`. */
  function hide() {
    if (phase === "hidden" || phase === "exiting") return;
    stop();
    drag = null;
    phase = "exiting";
    motion = motionNow();
    const dim = options.dim();
    if (dim) dim.style.pointerEvents = "none";
    measureReach();
    const timing = { slide: slideExit, rise: riseExit, fade: fadeTiming }[
      motion
    ];
    moveTo(awayFrom(pose), timing, timing, () => {
      phase = "hidden";
      options.onExited();
    });
  }

  function settle() {
    phase = "entering";
    const timing = prefersReducedMotion() ? reducedSettle : spring;
    moveTo(REST, timing, timing, markShown);
  }

  function isInTopRow(clientY: number) {
    const corner = options.closeCorner();
    if (!corner) return false;
    const cardTop = card.getBoundingClientRect().top;
    const { top, bottom } = corner.getBoundingClientRect();
    return clientY < bottom + (top - cardTop);
  }

  /** Where a touch that went down on the target can start a drag, if it can. */
  function touchStart(event: PointerEvent, target: Element): DragStart | null {
    if (event.pointerType !== "touch") return null;
    if (target.closest(NO_DRAG)) return null;
    if (isInTopRow(event.clientY)) return "top-row";
    if (options.scroller()?.contains(target)) return "content";
    return null;
  }

  function claim(dx: number, dy: number) {
    if (!drag) return "release";
    const scroll = scrolledBy(drag.target, options.scroller());
    return claimGesture(drag.start, dx, dy, scroll);
  }

  function begin(event: PointerEvent) {
    if (!drag) return;
    stop();
    drag.isActive = true;
    drag.base = pose.y;
    drag.startY = event.clientY;
    measureReach();
    phase = "dragging";
    try {
      card.setPointerCapture(event.pointerId);
    } catch {
      // A pointer that is gone cannot be captured, and the drag goes on.
    }
  }

  function onPointerDown(event: PointerEvent) {
    if (drag || !event.isPrimary || event.button !== 0) return;
    if (phase === "hidden" || phase === "exiting") return;
    if (window.matchMedia(WIDE_QUERY).matches) return;
    const { target } = event;
    if (!(target instanceof Element)) return;
    const isOnGrabber = options.grabber()?.contains(target) ?? false;
    const start = isOnGrabber ? "grabber" : touchStart(event, target);
    if (!start) return;
    drag = {
      pointerId: event.pointerId,
      start,
      target,
      startX: event.clientX,
      startY: event.clientY,
      base: 0,
      isActive: false,
      samples: [],
    };
    if (isOnGrabber) {
      event.preventDefault();
      begin(event);
    }
  }

  function onPointerMove(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (!drag.isActive) {
      const decision = claim(
        event.clientX - drag.startX,
        event.clientY - drag.startY,
      );
      if (decision === "wait") return;
      if (decision === "release") {
        drag = null;
        return;
      }
      begin(event);
    }
    drag.samples.push({ time: performance.now(), y: event.clientY });
    if (drag.samples.length > MAX_SAMPLES) drag.samples.shift();
    place({
      y: rubberBand(drag.base + event.clientY - drag.startY),
      scale: 1,
      fade: 1,
    });
  }

  function release(event: PointerEvent, canDismiss: boolean) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const ended = drag;
    drag = null;
    if (!ended.isActive) return;
    const velocity = releaseVelocity(ended.samples);
    if (canDismiss && shouldDismiss(pose.y, velocity, card.offsetHeight)) {
      hide();
      options.onDismiss();
      return;
    }
    settle();
  }

  function onPointerUp(event: PointerEvent) {
    release(event, true);
  }

  function onPointerCancel(event: PointerEvent) {
    release(event, false);
  }

  // The browser scrolls the content on a touch unless the first move is
  // cancelled. So a move that drags cancels it here, before the browser
  // takes the gesture and sends `pointercancel`.
  function onTouchMove(event: TouchEvent) {
    if (!drag || !event.cancelable) return;
    if (drag.isActive) {
      event.preventDefault();
      return;
    }
    const touch = event.touches.item(0);
    if (!touch) return;
    const decision = claim(
      touch.clientX - drag.startX,
      touch.clientY - drag.startY,
    );
    if (decision === "drag") event.preventDefault();
  }

  card.addEventListener("pointerdown", onPointerDown);
  card.addEventListener("pointermove", onPointerMove);
  card.addEventListener("pointerup", onPointerUp);
  card.addEventListener("pointercancel", onPointerCancel);
  card.addEventListener("touchmove", onTouchMove, { passive: false });

  return {
    show,
    hide,
    destroy() {
      card.removeEventListener("pointerdown", onPointerDown);
      card.removeEventListener("pointermove", onPointerMove);
      card.removeEventListener("pointerup", onPointerUp);
      card.removeEventListener("pointercancel", onPointerCancel);
      card.removeEventListener("touchmove", onTouchMove);
      for (const animation of animations) animation.cancel();
      animations = [];
      drag = null;
    },
  };
}

/** @internal */
export type SheetController = ReturnType<typeof createSheetController>;
