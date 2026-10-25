import { REDUCED_MOTION_QUERY } from "../motion/prefers-reduced-motion.ts";
import { stubMediaQueries } from "./stub-media-queries.ts";

/**
 * Asks for reduced motion, and for nothing else. Call
 * `vi.restoreAllMocks()` after the test.
 *
 * @internal
 */
export function reduceMotion() {
  stubMediaQueries((query) => query === REDUCED_MOTION_QUERY);
}
