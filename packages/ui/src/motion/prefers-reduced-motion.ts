import { motionConstants } from "../primitives/motion.stylex.ts";

/**
 * The bare media condition behind `motionConstants.REDUCED_MOTION`, for
 * `matchMedia`, which takes no `@media ` prefix.
 */
export const REDUCED_MOTION_QUERY = motionConstants.REDUCED_MOTION.replace(
  "@media ",
  "",
);

/**
 * Whether the user asks for reduced motion now. The one place the package
 * reads the setting: the motion engine, `useReducedMotion` and the effect
 * layer all read it here. For a read inside an effect or an event handler;
 * a component that renders from it takes `useReducedMotion`.
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia(REDUCED_MOTION_QUERY).matches
  );
}

/** Calls `onChange` when the reduced motion setting changes. */
export function subscribeReducedMotion(onChange: () => void): () => void {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => {
    query.removeEventListener("change", onChange);
  };
}
