import { useMediaQuery } from "#src/hooks/use-media-query.ts";

export function usePrefersReducedMotion() {
  return useMediaQuery("(prefers-reduced-motion: reduce)", false);
}
