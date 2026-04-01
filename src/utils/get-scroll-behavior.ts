/**
 * Returns `"instant"` when the user prefers reduced motion, `"smooth"` otherwise.
 *
 * CSS `scroll-behavior` automatically respects `prefers-reduced-motion` when set
 * to `auto`, but the JavaScript `scrollTo({ behavior })` API does **not** honour
 * the media query — `"smooth"` always animates regardless of the user's system
 * preference. This helper bridges that gap so every programmatic scroll call
 * can respect the preference without duplicating the `matchMedia` check.
 */
export function getScrollBehavior(): ScrollBehavior {
  if (typeof window === "undefined") return "instant";
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "instant"
    : "smooth";
}
