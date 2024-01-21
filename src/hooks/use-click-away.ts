import { useEffect, useRef } from "react";
import useEventCallback from "@mui/utils/useEventCallback";

export function useClickAway<T extends HTMLElement = HTMLElement>(
  callback: (event: MouseEvent | TouchEvent) => void
) {
  const ref = useRef<T>(null);
  const stableCallback = useEventCallback(callback);

  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      const element = ref.current;
      if (element && e.target && !element.contains(e.target as Node)) {
        stableCallback(e);
      }
    };

    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);

    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [stableCallback]);

  return ref;
}
