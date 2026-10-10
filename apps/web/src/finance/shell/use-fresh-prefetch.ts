import { useSyncExternalStore } from "react";

/** Shorter than the 5 minutes for which Next keeps a prefetched screen. */
const REFRESH_INTERVAL_MS = 60_000;

const listeners = new Set<() => void>();
let enabled = true;
let frame = 0;
let timer: ReturnType<typeof setInterval> | undefined;

function setEnabled(next: boolean) {
  enabled = next;
  for (const listener of listeners) listener();
}

// Next prefetches a link again when its prefetch goes off and on. It fetches
// only the screens whose copy is stale, so a fresh screen costs no request.
function refresh() {
  if (document.visibilityState !== "visible") return;
  cancelAnimationFrame(frame);
  setEnabled(false);
  frame = requestAnimationFrame(() => {
    setEnabled(true);
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    timer = setInterval(refresh, REFRESH_INTERVAL_MS);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("online", refresh);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;
    clearInterval(timer);
    cancelAnimationFrame(frame);
    enabled = true;
    document.removeEventListener("visibilitychange", refresh);
    window.removeEventListener("online", refresh);
  };
}

/**
 * The `prefetch` prop for a link to a Finance screen. The screen is
 * prefetched in full, so a tap shows it at once, also offline. Next keeps
 * a prefetch for 5 minutes, so the links prefetch again every minute and
 * when the app comes back into view or online.
 */
export function useFreshPrefetch(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => enabled,
    () => true,
  );
}
