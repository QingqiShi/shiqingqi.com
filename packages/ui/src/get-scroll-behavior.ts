import { prefersReducedMotion } from "./prefers-reduced-motion.ts";

/**
 * `"smooth"`, or `"instant"` when the user asks for reduced motion.
 *
 * Read at scroll time rather than at mount, so it always reports the current
 * setting: the user can change it while the page is open.
 */
export function getScrollBehavior(): ScrollBehavior {
  return typeof window !== "undefined" && prefersReducedMotion()
    ? "instant"
    : "smooth";
}
