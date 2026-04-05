/**
 * Returns `"smooth"` or `"instant"` based on the user's
 * `prefers-reduced-motion` media query.
 *
 * Call this at scroll-time (not at mount) so it always reflects the
 * current system setting — the user can toggle reduced-motion while
 * the page is open.
 */
export function getScrollBehavior(): ScrollBehavior {
  return typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "instant"
    : "smooth";
}
