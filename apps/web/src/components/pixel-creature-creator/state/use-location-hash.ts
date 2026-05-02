"use client";

import { useSyncExternalStore } from "react";

/**
 * Subscribes the calling component to `window.location.hash` changes.
 *
 * Returns the raw hash string including the leading `#` (or `""` when the
 * URL has no fragment). Consumers that want the bare value should strip the
 * prefix themselves so they stay in control of empty-vs-missing semantics.
 *
 * The server snapshot is `""` — every consumer renders client-side anyway,
 * but providing a stable SSR value lets components distinguish hydration
 * from "no hash yet" without sprinkling `typeof window` checks at the call
 * site.
 */
export function useLocationHash(): string {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

const subscribe = (notify: () => void): (() => void) => {
  window.addEventListener("hashchange", notify);
  return () => {
    window.removeEventListener("hashchange", notify);
  };
};

const getSnapshot = (): string => window.location.hash;

const getServerSnapshot = (): string => "";
