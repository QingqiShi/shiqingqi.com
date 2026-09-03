import { motionConstants } from "../primitives/motion.stylex.ts";

// Derived from the StyleX const rather than restated, so the JS-side check
// cannot drift from the style-side one — `matchMedia` takes the bare
// condition, while the StyleX const carries the `@media ` prefix.
const REDUCED_MOTION_QUERY = motionConstants.REDUCED_MOTION.replace(
  "@media ",
  "",
);

/**
 * `"smooth"`, or `"instant"` when the user asks for reduced motion.
 *
 * Read at scroll time rather than at mount, so it always reports the current
 * setting: the user can change it while the page is open.
 */
export function getScrollBehavior(): ScrollBehavior {
  return typeof window !== "undefined" &&
    window.matchMedia(REDUCED_MOTION_QUERY).matches
    ? "instant"
    : "smooth";
}
