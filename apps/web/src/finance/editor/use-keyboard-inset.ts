import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  const viewport = window.visualViewport;
  if (!viewport) return () => undefined;
  viewport.addEventListener("resize", onChange);
  viewport.addEventListener("scroll", onChange);
  return () => {
    viewport.removeEventListener("resize", onChange);
    viewport.removeEventListener("scroll", onChange);
  };
}

function read() {
  const viewport = window.visualViewport;
  if (!viewport) return 0;
  return Math.max(
    0,
    Math.round(window.innerHeight - viewport.height - viewport.offsetTop),
  );
}

/**
 * How many pixels of the layout viewport an on-screen keyboard covers at the
 * bottom, 0 when none does. iOS Safari keeps the layout viewport tall under
 * its keyboard, so a bar at the bottom of a sheet needs this to stay in view.
 */
export function useKeyboardInset() {
  return useSyncExternalStore(subscribe, read, () => 0);
}
