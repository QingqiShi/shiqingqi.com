import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from "react";

/**
 * What a reader has picked on a chart: one point, or a range from the point
 * they started at (`anchor`) to the point they are on now (`index`). The
 * anchor can sit after the index, and both can be the same.
 */
export type ChartSelection =
  | { kind: "point"; index: number }
  | { kind: "range"; anchor: number; index: number };

interface ChartSelectionOptions<Data> {
  /** The chart's data. A new value clears the selection. */
  data: Data;
  count: number;
  /** The index under `x`, in pixels from the plot's left edge; -1 for none. */
  indexAt: (x: number) => number;
  /** The plot the pointer and keyboard handlers are on. */
  plotRef: RefObject<HTMLElement | null>;
  /** False reads points only: no drag, second finger or Shift range. */
  ranges?: boolean;
}

interface MouseDrag {
  anchor: number;
  startX: number;
  ranging: boolean;
}

/** How far, in pixels, a mouse must move with its button down to start a range. */
const DRAG_THRESHOLD = 4;

/**
 * The selection after a key press on a chart of `count` points, or
 * `undefined` when the chart does not use the key. The arrow keys, Home and
 * End move one point from the current one (the last point when there is
 * none); with Shift they move the range's moving end and keep its anchor, so
 * a first Shift press anchors the range at the current point. Escape clears.
 */
export function selectionAfterKey(
  selection: ChartSelection | null,
  key: string,
  shiftKey: boolean,
  count: number,
): ChartSelection | null | undefined {
  const lastIndex = count - 1;
  if (lastIndex < 0) return undefined;
  if (key === "Escape") return selection === null ? undefined : null;
  const current = selection?.index ?? lastIndex;
  const moves: Record<string, number> = {
    ArrowLeft: Math.max(current - 1, 0),
    ArrowRight: Math.min(current + 1, lastIndex),
    Home: 0,
    End: lastIndex,
  };
  if (!(key in moves)) return undefined;
  const index = moves[key];
  if (!shiftKey) return { kind: "point", index };
  const anchor = selection?.kind === "range" ? selection.anchor : current;
  return { kind: "range", anchor, index };
}

/**
 * The selection the fingers on a chart make, in the order they touched: one
 * finger reads a point, two read the range between them.
 */
export function selectionFromTouches(
  indices: readonly number[],
): ChartSelection | null {
  if (indices.length === 0) return null;
  if (indices.length === 1) return { kind: "point", index: indices[0] };
  return { kind: "range", anchor: indices[0], index: indices[1] };
}

function sameSelection(a: ChartSelection | null, b: ChartSelection | null) {
  if (a === null || b === null) return a === b;
  if (a.kind === "point" || b.kind === "point") {
    return a.kind === b.kind && a.index === b.index;
  }
  return a.anchor === b.anchor && a.index === b.index;
}

function fits(selection: ChartSelection, count: number) {
  return (
    selection.index < count &&
    (selection.kind === "point" || selection.anchor < count)
  );
}

function blockMultiTouch(event: TouchEvent) {
  if (event.cancelable && event.touches.length > 1) event.preventDefault();
}

function blockGesture(event: Event) {
  event.preventDefault();
}

/**
 * The point or range a reader picks on a chart. A mouse reads the point
 * under it, and a drag reads the range from where it was pressed. One
 * finger reads the point under it, and two read the range between them.
 * The arrow keys, Home and End read a point; with Shift they read a range
 * from where Shift was first held. Escape, a blur, the mouse leaving and the
 * last finger lifting clear it. With `ranges` false, every way reads a
 * point.
 */
export function useChartSelection<Data>({
  data,
  count,
  indexAt,
  plotRef,
  ranges = true,
}: ChartSelectionOptions<Data>) {
  const rectRef = useRef<DOMRect | null>(null);
  const dragRef = useRef<MouseDrag | null>(null);
  const touchesRef = useRef(new Map<number, number>());
  const [state, setState] = useState<{
    data: Data;
    selection: ChartSelection;
  } | null>(null);
  const selection =
    state?.data === data && fits(state.selection, count)
      ? state.selection
      : null;

  useEffect(() => {
    const element = plotRef.current;
    if (!element || !ranges) return;
    // The plot lets a single finger scroll the page up and down. A second
    // finger starts a range, so stop the browser from scrolling or zooming
    // the page with it. iOS Safari zooms on "gesturestart" without this.
    const options = { passive: false };
    element.addEventListener("touchstart", blockMultiTouch, options);
    element.addEventListener("touchmove", blockMultiTouch, options);
    element.addEventListener("gesturestart", blockGesture, options);
    return () => {
      element.removeEventListener("touchstart", blockMultiTouch);
      element.removeEventListener("touchmove", blockMultiTouch);
      element.removeEventListener("gesturestart", blockGesture);
    };
  }, [plotRef, ranges]);

  function select(next: ChartSelection | null) {
    if (sameSelection(next, selection)) return;
    setState(next === null ? null : { data, selection: next });
  }

  function clear() {
    rectRef.current = null;
    dragRef.current = null;
    touchesRef.current.clear();
    setState(null);
  }

  /** Reads the plot's box again; later events reuse it until `clear`. */
  function measure(event: PointerEvent<HTMLElement>) {
    rectRef.current = event.currentTarget.getBoundingClientRect();
  }

  function locate(event: PointerEvent<HTMLElement>) {
    let rect = rectRef.current;
    if (rect === null) {
      rect = event.currentTarget.getBoundingClientRect();
      rectRef.current = rect;
    }
    const x = event.clientX - rect.left;
    return { x, index: indexAt(x) };
  }

  function selectFromTouches() {
    select(selectionFromTouches(Array.from(touchesRef.current.values())));
  }

  function onPointerDown(event: PointerEvent<HTMLElement>) {
    measure(event);
    const { x, index } = locate(event);
    if (index < 0) return;
    if (event.pointerType === "mouse") {
      if (event.button !== 0) return;
      if (ranges) {
        dragRef.current = { anchor: index, startX: x, ranging: false };
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      select({ kind: "point", index });
    } else {
      if (touchesRef.current.size >= (ranges ? 2 : 1)) return;
      touchesRef.current.set(event.pointerId, index);
      event.currentTarget.setPointerCapture(event.pointerId);
      selectFromTouches();
    }
  }

  function onPointerMove(event: PointerEvent<HTMLElement>) {
    const { x, index } = locate(event);
    if (index < 0) return;
    if (event.pointerType === "mouse") {
      const drag = dragRef.current;
      if (drag === null) {
        select({ kind: "point", index });
        return;
      }
      if (!drag.ranging) {
        drag.ranging = Math.abs(x - drag.startX) >= DRAG_THRESHOLD;
      }
      select(
        drag.ranging
          ? { kind: "range", anchor: drag.anchor, index }
          : { kind: "point", index },
      );
    } else if (touchesRef.current.has(event.pointerId)) {
      touchesRef.current.set(event.pointerId, index);
      selectFromTouches();
    }
  }

  function onPointerUp(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === "mouse") {
      dragRef.current = null;
      const rect = event.currentTarget.getBoundingClientRect();
      const inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      if (!inside) {
        clear();
        return;
      }
      const { index } = locate(event);
      if (index >= 0) select({ kind: "point", index });
      return;
    }
    touchesRef.current.delete(event.pointerId);
    if (touchesRef.current.size === 0) clear();
    else selectFromTouches();
  }

  return {
    selection,
    measure,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    /** The browser took the gesture over, such as to scroll the page. */
    onPointerCancel: clear,
    onPointerLeave: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType === "mouse" && dragRef.current === null) clear();
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      const next = selectionAfterKey(
        selection,
        event.key,
        ranges && event.shiftKey,
        count,
      );
      if (next === undefined) return;
      event.preventDefault();
      select(next);
    },
    onBlur: clear,
  };
}
