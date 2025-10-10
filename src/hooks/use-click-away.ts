import { useEffect, useRef } from "react";

export function useClickAway<T extends HTMLElement = HTMLElement>(
  callback: (event: MouseEvent | TouchEvent) => void,
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      const element = ref.current;
      if (element && e.target && !element.contains(e.target as Node)) {
        callback(e);
      }
    };

    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);

    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  });

  return ref;
}
