"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * `false` for the server render and the hydration pass, `true` from the
 * first client render after it. Lets a component defer client-only
 * rendering until hydration has settled, so the server and client agree on
 * the first pass.
 */
export function useIsHydrated() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
