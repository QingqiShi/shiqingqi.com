import type { MotionEngine } from "../../motion/create-motion-engine.ts";
import { createMotionValue } from "../../motion/create-motion-value.ts";
import { writeStyles } from "../../motion/px.ts";
import { CROSS_FADE, show } from "./show.ts";
import type { Part } from "./types.ts";

/**
 * A fade of an element over `CROSS_FADE` seconds, out over what replaced it, or in.
 *
 * @internal
 */
export function createFade(
  engine: MotionEngine,
  element: HTMLElement,
  direction: "in" | "out",
): Part {
  const shown = createMotionValue(engine, 0);
  shown.to(1, { tween: { duration: CROSS_FADE } });
  const out = direction === "out";
  const binding = show(element, shown, (t) => ({
    opacity: (out ? 1 - t : t).toFixed(3),
    "z-index": out ? "2" : "",
    visibility: out ? "visible" : "",
    "content-visibility": out ? "visible" : "",
  }));
  return {
    isMoving: () => shown.isMoving,
    drop() {
      binding.unbind();
      shown.stop();
      writeStyles(element, { transform: "", "background-color": "" });
    },
  };
}
