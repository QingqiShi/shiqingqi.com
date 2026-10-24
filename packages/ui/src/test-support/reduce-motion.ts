import { vi } from "vitest";
import { REDUCED_MOTION_QUERY } from "../prefers-reduced-motion.ts";

/**
 * Asks for reduced motion, and for nothing else. Call
 * `vi.restoreAllMocks()` after the test.
 *
 * @internal
 */
export function reduceMotion() {
  const real = window.matchMedia.bind(window);
  vi.spyOn(window, "matchMedia").mockImplementation((query) => {
    const list = real(query);
    Object.defineProperty(list, "matches", {
      value: query === REDUCED_MOTION_QUERY,
    });
    return list;
  });
}
