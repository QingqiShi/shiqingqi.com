import { motionConstants } from "./primitives/motion.stylex.ts";

/**
 * The bare media condition behind `motionConstants.REDUCED_MOTION`, for
 * `matchMedia`, which takes no `@media ` prefix. Derived from the StyleX const,
 * so the script side cannot drift from the style side.
 */
export const REDUCED_MOTION_QUERY = motionConstants.REDUCED_MOTION.replace(
  "@media ",
  "",
);

/**
 * Whether the user asks for reduced motion right now. For a read inside an
 * effect or an event handler; a component that renders from the setting
 * subscribes to `REDUCED_MOTION_QUERY` instead, so it re-renders on a change.
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}
