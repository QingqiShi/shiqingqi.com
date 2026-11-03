import { createMotionEngine } from "@tuja/ui/motion/create-motion-engine";
import { createMotionValue } from "@tuja/ui/motion/create-motion-value";
import { prefersReducedMotion } from "@tuja/ui/motion/prefers-reduced-motion";
import { springOf, springRoles } from "@tuja/ui/motion/spring-roles";

/** A scroll of the visitor's own stops the spring. */
const STOP_EVENTS = ["wheel", "touchstart", "pointerdown", "keydown"] as const;

/**
 * The share of the distance the page may go past its end. The system spring,
 * started at rest, goes about 5% past its target.
 */
const OVERSHOOT_ROOM = 0.1;

/** The share of the distance left when the page is near its target. */
const NEAR = 0.15;

/**
 * Springs `scroller`, or the page where it is null, on the system spring until
 * `target` is at the top of the scroller, less its scroll margin, or until the
 * scroller ends. Under reduced motion, it jumps. `finished` is true when it comes
 * to rest there, and false when the visitor scrolls, presses or types first, or
 * `stop` is called. `onNear` runs once, when it has gone most of the way, or when
 * it jumps there.
 */
export function springScrollTo(
  target: Element,
  scroller: HTMLElement | null,
  onNear?: () => void,
) {
  const root = document.documentElement;
  const from = scroller?.scrollTop ?? window.scrollY;
  const end =
    scroller === null
      ? root.scrollHeight - window.innerHeight
      : scroller.scrollHeight - scroller.clientHeight;
  const edge = scroller?.getBoundingClientRect().top ?? 0;
  const margin = parseFloat(getComputedStyle(target).scrollMarginBlockStart);
  const to = Math.min(
    end,
    Math.max(0, target.getBoundingClientRect().top - edge + from - margin),
  );

  const engine = createMotionEngine();
  const scroll = createMotionValue(engine, from, {
    spring: springOf(springRoles.move),
    precision: 1,
  });
  let isNear = false;
  const reachNear = () => {
    if (!isNear) {
      isNear = true;
      onNear?.();
    }
  };
  const near = Math.abs(to - from) * NEAR;
  const unsubscribe = scroll.subscribe((top) => {
    (scroller ?? window).scrollTo({ top, behavior: "instant" });
    if (Math.abs(to - top) <= near) reachNear();
  });

  // A scroller cannot scroll past its end, so the spring would stop hard there.
  // Give it room below its end while the spring moves, as a rubber band.
  const roomBox =
    scroller === null
      ? target.closest("main")
      : scroller.firstElementChild instanceof HTMLElement
        ? scroller.firstElementChild
        : null;
  const hasRoom =
    roomBox !== null && to === end && to > from && !prefersReducedMotion();
  if (hasRoom) {
    const padding = parseFloat(getComputedStyle(roomBox).paddingBlockEnd);
    const room = Math.ceil((to - from) * OVERSHOOT_ROOM);
    roomBox.style.paddingBlockEnd = `${String(padding + room)}px`;
  }

  // Leave the page where it shows now, not where the spring is at this
  // instant, which can be most of a frame ahead.
  const stop = () => {
    unsubscribe();
    scroll.stop();
  };
  for (const type of STOP_EVENTS) {
    window.addEventListener(type, stop, { capture: true, passive: true });
  }

  const finished = scroll
    .to(to)
    .finished.finally(() => {
      for (const type of STOP_EVENTS) {
        window.removeEventListener(type, stop, { capture: true });
      }
      unsubscribe();
      engine.destroy();
      if (hasRoom) roomBox.style.removeProperty("padding-block-end");
    })
    .then((isThere) => {
      if (isThere) reachNear();
      return isThere;
    });

  return { finished, stop };
}
