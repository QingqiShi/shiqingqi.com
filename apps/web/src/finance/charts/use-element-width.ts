import { useEffect, useRef, useState } from "react";

/**
 * The content width of the element `ref` points at, kept current with a
 * `ResizeObserver`. It is 0 until the first measure.
 */
export function useElementWidth<Element extends HTMLElement>() {
  const ref = useRef<Element>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    setWidth(element.clientWidth);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.round(entry.contentRect.width));
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  return { ref, width };
}
