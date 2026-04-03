import { useRef, useSyncExternalStore } from "react";

/**
 * Stable subscription binding for a single media query string.
 *
 * Caching the MediaQueryList avoids creating a new object on every render,
 * and keeping `subscribe` / `getSnapshot` as stable references prevents
 * `useSyncExternalStore` from unsubscribing and re-subscribing on every
 * render.
 */
interface MediaQueryBinding {
  query: string;
  subscribe: (onChange: () => void) => () => void;
  getSnapshot: () => boolean;
}

function createMediaQueryBinding(query: string): MediaQueryBinding {
  const mql = window.matchMedia(query);

  return {
    query,
    subscribe(onChange: () => void) {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    getSnapshot() {
      return mql.matches;
    },
  };
}

export function useMediaQuery(query: string, defaultValue?: boolean) {
  const bindingRef = useRef<MediaQueryBinding | null>(null);

  // Create the binding lazily, and recreate when the query string changes.
  if (
    typeof window !== "undefined" &&
    (bindingRef.current === null || bindingRef.current.query !== query)
  ) {
    bindingRef.current = createMediaQueryBinding(query);
  }

  const getServerSnapshot = () => {
    if (typeof defaultValue !== "undefined") {
      return defaultValue;
    }

    if (process.env.NODE_ENV !== "production") {
      throw Error("useMediaQuery is a client-only hook");
    }

    return false;
  };

  return useSyncExternalStore(
    bindingRef.current?.subscribe ?? noopSubscribe,
    bindingRef.current?.getSnapshot ?? (() => defaultValue ?? false),
    getServerSnapshot,
  );
}

function noopSubscribe() {
  return () => {};
}
