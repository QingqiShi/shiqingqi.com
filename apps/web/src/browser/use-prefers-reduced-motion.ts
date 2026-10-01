import { REDUCED_MOTION_QUERY } from "@tuja/ui/utils/prefers-reduced-motion";
import { useMediaQuery } from "./use-media-query.ts";

export function usePrefersReducedMotion() {
  return useMediaQuery(REDUCED_MOTION_QUERY, false);
}
