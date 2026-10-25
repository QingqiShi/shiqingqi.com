import { useSyncExternalStore } from "react";
import {
  prefersReducedMotion,
  subscribeReducedMotion,
} from "./prefers-reduced-motion.ts";

/**
 * Whether the user asks for reduced motion, as a render reads it.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    prefersReducedMotion,
    () => false,
  );
}
