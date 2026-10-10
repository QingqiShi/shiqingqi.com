import {
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type UIEvent,
} from "react";

interface ChartScrubOptions<Data> {
  /** The chart's data. A new value clears the picked index. */
  data: Data;
  count: number;
  /** The index under `x`, in pixels from the plot's left edge; -1 for none. */
  indexAt: (x: number) => number;
}

/**
 * The index a reader picks on a chart by pointing, dragging, or with the
 * arrow keys, Home and End. Escape and a blur clear it.
 */
export function useChartScrub<Data>({
  data,
  count,
  indexAt,
}: ChartScrubOptions<Data>) {
  const rectRef = useRef<DOMRect | null>(null);
  const [scrub, setScrub] = useState<{ data: Data; index: number } | null>(
    null,
  );
  const active =
    scrub?.data === data && scrub.index < count ? scrub.index : null;

  function pick(index: number) {
    setScrub({ data, index });
  }

  /** Reads the plot's box again; a scrub reuses it until `clear`. */
  function measure(event: UIEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    rectRef.current = rect;
    return rect;
  }

  function pickAt(event: PointerEvent<HTMLElement>) {
    rectRef.current ??= event.currentTarget.getBoundingClientRect();
    const index = indexAt(event.clientX - rectRef.current.left);
    if (index >= 0 && index !== active) pick(index);
  }

  function clear() {
    rectRef.current = null;
    setScrub(null);
  }

  return {
    active,
    measure,
    clear,
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      measure(event);
      pickAt(event);
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType !== "mouse" && event.buttons === 0) return;
      pickAt(event);
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      const lastIndex = count - 1;
      if (lastIndex < 0) return;
      const current = active ?? lastIndex;
      const moves: Record<string, number> = {
        ArrowLeft: Math.max(current - 1, 0),
        ArrowRight: Math.min(current + 1, lastIndex),
        Home: 0,
        End: lastIndex,
      };
      if (event.key in moves) {
        event.preventDefault();
        pick(moves[event.key]);
      } else if (event.key === "Escape" && active !== null) {
        event.preventDefault();
        setScrub(null);
      }
    },
    onBlur: () => {
      setScrub(null);
    },
  };
}
