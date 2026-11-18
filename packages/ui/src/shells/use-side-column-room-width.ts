import { useLayoutEffect, useState } from "react";

/**
 * The width of the room that the column keeps in the flow, which the fixed
 * column takes. It keeps the last width while the column leaves and the room
 * is gone.
 *
 * @internal
 */
export function useSideColumnRoomWidth(room: HTMLElement | null) {
  const [width, setWidth] = useState<number | null>(null);
  useLayoutEffect(() => {
    if (room === null) return;
    const measure = () => {
      setWidth(room.getBoundingClientRect().width);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(room);
    return () => {
      observer.disconnect();
    };
  }, [room]);
  return width;
}
