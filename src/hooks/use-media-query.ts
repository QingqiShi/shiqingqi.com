import { useCallback, useSyncExternalStore } from "react";

export function useMediaQuery(query: string, defaultValue?: boolean) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const matchMedia = window.matchMedia(query);

      matchMedia.addEventListener("change", onChange);
      return () => {
        matchMedia.removeEventListener("change", onChange);
      };
    },
    [query]
  );

   const getSnapshot = () => window.matchMedia(query).matches;

   const getServerSnapshot = () => {
    if (typeof defaultValue !== "undefined") {
      return defaultValue;
    }

    if (process.env.NODE_ENV !== "production") {
      throw Error("useMediaQuery is a client-only hook");
    }

    return false;
  };

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
