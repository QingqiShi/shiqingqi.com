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

/**
 * Springs the page on the system spring until `target` is at the top of the
 * screen, less its scroll margin, or until the page ends. Under reduced
 * motion, it jumps. `finished` is true when the page comes to rest there,
 * and false when the visitor scrolls, presses or types first, or `stop` is
 * called.
 */
export function springScrollTo(target: Element) {
  const root = document.documentElement;
  const from = window.scrollY;
  const end = root.scrollHeight - window.innerHeight;
  const margin = parseFloat(getComputedStyle(target).scrollMarginBlockStart);
  const to = Math.min(
    end,
    Math.max(0, target.getBoundingClientRect().top + from - margin),
  );

  const engine = createMotionEngine();
  const scroll = createMotionValue(engine, from, {
    spring: springOf(springRoles.move),
    precision: 1,
  });
  const unsubscribe = scroll.subscribe((top) => {
    window.scrollTo({ top, behavior: "instant" });
  });

  // The page cannot scroll past its end, so the spring would stop hard there.
  // Give the page room below its end while the spring moves, as a rubber band.
  // Put the room in `main`, so that the sticky rail beside it stays stuck.
  const roomBox = target.closest("main");
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

  const finished = scroll.to(to).finished.finally(() => {
    for (const type of STOP_EVENTS) {
      window.removeEventListener(type, stop, { capture: true });
    }
    unsubscribe();
    engine.destroy();
    if (hasRoom) roomBox.style.removeProperty("padding-block-end");
  });

  return { finished, stop };
}
