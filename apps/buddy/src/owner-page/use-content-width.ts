import { useState } from "react";

/** The width of the page column on a 390px phone, which the server draws at. */
const SERVER_WIDTH = 358;
const MIN_WIDTH = 300;
const MAX_WIDTH = 560;

function snap(width: number) {
  return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.floor(width / 2) * 2));
}

/** The drawing width that fits the element the ref is on, in whole CSS pixels. */
export function useContentWidth() {
  const [width, setWidth] = useState(SERVER_WIDTH);
  const ref = (node: HTMLElement | null) => {
    if (node === null) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(snap(entry.contentRect.width));
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  };
  return [width, ref] as const;
}
