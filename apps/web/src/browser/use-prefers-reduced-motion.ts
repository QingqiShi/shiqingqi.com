import { useMediaQuery } from "./use-media-query.ts";

export function usePrefersReducedMotion() {
  return useMediaQuery("(prefers-reduced-motion: reduce)", false);
}
