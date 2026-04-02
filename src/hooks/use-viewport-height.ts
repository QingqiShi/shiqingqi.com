import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

function getSnapshot() {
  return window.innerHeight;
}

function getServerSnapshot() {
  return 0;
}

/**
 * Returns the current viewport height, updating on window resize.
 *
 * Uses `useSyncExternalStore` (matching the pattern in `use-media-query.ts`)
 * so the subscription identity is stable and React can tear-free read the
 * value during concurrent renders.
 */
export function useViewportHeight() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
