import { useRef } from "react";
import { normalizeRect } from "#src/sprite-editor/pixel-ops/normalize-rect.ts";
import type { Rect } from "#src/sprite-editor/pixel-ops/types.ts";
import { HANDLE_SIZE } from "./draw-editor-canvas";
import type { CellPixels, Selection, Tool, Transform } from "./types";

interface CanvasPointerOptions {
  present: CellPixels;
  tool: Tool;
  transform: Transform | null;
  setTransform: (next: Transform) => void;
  selection: Selection | null;
  setSelection: (next: Selection | null) => void;
  commitSelection: () => void;
  liftIfMarquee: (sel: Selection) => Selection;
  applyAtPixel: (px: number, py: number, isDrag: boolean) => void;
}

export function useCanvasPointer({
  present,
  tool,
  transform,
  setTransform,
  selection,
  setSelection,
  commitSelection,
  liftIfMarquee,
  applyAtPixel,
}: CanvasPointerOptions) {
  // Pointer handling --------------------------------------------------------

  type DragKind =
    | { kind: "paint"; lastX: number; lastY: number }
    | {
        kind: "pan";
        startX: number;
        startY: number;
        basePan: { x: number; y: number };
      }
    | { kind: "marquee"; startX: number; startY: number }
    | { kind: "move"; startX: number; startY: number; baseRect: Rect }
    | { kind: "resize"; baseRect: Rect };

  const dragRef = useRef<({ pointerId: number } & DragKind) | null>(null);

  const pointerToCanvas = (
    event: React.PointerEvent<HTMLCanvasElement>,
  ): { cx: number; cy: number } => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      cx: event.clientX - rect.left,
      cy: event.clientY - rect.top,
    };
  };

  const canvasToPixel = (
    cx: number,
    cy: number,
  ): readonly [number, number] | null => {
    if (transform === null) return null;
    const px = Math.floor((cx - transform.panX) / transform.scale);
    const py = Math.floor((cy - transform.panY) / transform.scale);
    if (px < 0 || py < 0 || px >= present.width || py >= present.height) {
      return null;
    }
    return [px, py];
  };

  const isOnResizeHandle = (cx: number, cy: number): boolean => {
    if (selection === null || transform === null) return false;
    const r = selection.rect;
    const hx = transform.panX + (r.x + r.w) * transform.scale;
    const hy = transform.panY + (r.y + r.h) * transform.scale;
    return (
      Math.abs(cx - hx) <= HANDLE_SIZE / 2 + 2 &&
      Math.abs(cy - hy) <= HANDLE_SIZE / 2 + 2
    );
  };

  const isInsideSelectionRect = (px: number, py: number): boolean => {
    if (selection === null) return false;
    const r = selection.rect;
    return px >= r.x && py >= r.y && px < r.x + r.w && py < r.y + r.h;
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0 && event.button !== 1) return;
    if (transform === null) return;
    const { cx, cy } = pointerToCanvas(event);

    // Pan: middle-click or Shift + left-click.
    if (event.button === 1 || event.shiftKey) {
      event.currentTarget.setPointerCapture(event.pointerId);
      dragRef.current = {
        pointerId: event.pointerId,
        kind: "pan",
        startX: cx,
        startY: cy,
        basePan: { x: transform.panX, y: transform.panY },
      };
      return;
    }

    if (tool === "select") {
      // Resize-handle takes priority over inside-selection so users can
      // grab the corner even when it's near the rect edge.
      if (isOnResizeHandle(cx, cy) && selection !== null) {
        event.currentTarget.setPointerCapture(event.pointerId);
        const lifted = liftIfMarquee(selection);
        setSelection(lifted);
        dragRef.current = {
          pointerId: event.pointerId,
          kind: "resize",
          baseRect: { ...lifted.rect },
        };
        return;
      }
      const point = canvasToPixel(cx, cy);
      if (
        point !== null &&
        isInsideSelectionRect(point[0], point[1]) &&
        selection !== null
      ) {
        event.currentTarget.setPointerCapture(event.pointerId);
        const lifted = liftIfMarquee(selection);
        setSelection(lifted);
        dragRef.current = {
          pointerId: event.pointerId,
          kind: "move",
          startX: cx,
          startY: cy,
          baseRect: { ...lifted.rect },
        };
        return;
      }
      // Click outside: commit any existing floating selection, then start a
      // new marquee from the click point.
      if (selection !== null) {
        commitSelection();
      }
      if (point === null) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      setSelection({
        mode: "marquee",
        rect: { x: point[0], y: point[1], w: 0, h: 0 },
      });
      dragRef.current = {
        pointerId: event.pointerId,
        kind: "marquee",
        startX: point[0],
        startY: point[1],
      };
      return;
    }

    // Painting tools.
    const point = canvasToPixel(cx, cy);
    if (point === null) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      kind: "paint",
      lastX: point[0],
      lastY: point[1],
    };
    applyAtPixel(point[0], point[1], false);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (drag === null || event.pointerId !== drag.pointerId) return;
    if (transform === null) return;
    const { cx, cy } = pointerToCanvas(event);

    if (drag.kind === "pan") {
      setTransform({
        scale: transform.scale,
        panX: drag.basePan.x + (cx - drag.startX),
        panY: drag.basePan.y + (cy - drag.startY),
      });
      return;
    }
    if (drag.kind === "marquee") {
      const point = canvasToPixel(cx, cy);
      if (point === null) return;
      // The rectangle covers from start to end inclusive.
      const x = Math.min(drag.startX, point[0]);
      const y = Math.min(drag.startY, point[1]);
      const w = Math.abs(point[0] - drag.startX) + 1;
      const h = Math.abs(point[1] - drag.startY) + 1;
      setSelection({ mode: "marquee", rect: { x, y, w, h } });
      return;
    }
    if (drag.kind === "move") {
      const sel = selection;
      if (sel === null || sel.mode !== "floating") return;
      const dx = Math.round((cx - drag.startX) / transform.scale);
      const dy = Math.round((cy - drag.startY) / transform.scale);
      setSelection({
        ...sel,
        rect: {
          x: drag.baseRect.x + dx,
          y: drag.baseRect.y + dy,
          w: drag.baseRect.w,
          h: drag.baseRect.h,
        },
      });
      return;
    }
    if (drag.kind === "resize") {
      const sel = selection;
      if (sel === null || sel.mode !== "floating") return;
      const handlePixelX = Math.round((cx - transform.panX) / transform.scale);
      const handlePixelY = Math.round((cy - transform.panY) / transform.scale);
      const w = Math.max(1, handlePixelX - drag.baseRect.x);
      const h = Math.max(1, handlePixelY - drag.baseRect.y);
      setSelection({ ...sel, rect: { ...drag.baseRect, w, h } });
      return;
    }
    // Paint — drag.kind is narrowed to "paint" here.
    if (tool !== "pencil" && tool !== "eraser") return;
    const point = canvasToPixel(cx, cy);
    if (point === null) return;
    if (point[0] === drag.lastX && point[1] === drag.lastY) return;
    drag.lastX = point[0];
    drag.lastY = point[1];
    applyAtPixel(point[0], point[1], true);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (
      dragRef.current !== null &&
      event.pointerId === dragRef.current.pointerId &&
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag === null) return;
    // Drop a zero-area marquee — can happen on a quick click.
    if (drag.kind === "marquee" && selection !== null) {
      const r = normalizeRect(selection.rect);
      if (r.w < 1 || r.h < 1) {
        setSelection(null);
      } else {
        setSelection({ mode: "marquee", rect: r });
      }
    }
  };

  return { handlePointerDown, handlePointerMove, handlePointerUp };
}
