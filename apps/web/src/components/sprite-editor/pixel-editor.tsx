"use client";

import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowCounterClockwise";
import { ArrowUUpLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowUUpLeft";
import { ArrowUUpRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowUUpRight";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { CopyIcon } from "@phosphor-icons/react/dist/ssr/Copy";
import { EraserIcon } from "@phosphor-icons/react/dist/ssr/Eraser";
import { EyedropperIcon } from "@phosphor-icons/react/dist/ssr/Eyedropper";
import { FlipHorizontalIcon } from "@phosphor-icons/react/dist/ssr/FlipHorizontal";
import { FlipVerticalIcon } from "@phosphor-icons/react/dist/ssr/FlipVertical";
import { FrameCornersIcon } from "@phosphor-icons/react/dist/ssr/FrameCorners";
import { MagicWandIcon } from "@phosphor-icons/react/dist/ssr/MagicWand";
import { PaintBucketIcon } from "@phosphor-icons/react/dist/ssr/PaintBucket";
import { PencilSimpleIcon } from "@phosphor-icons/react/dist/ssr/PencilSimple";
import { SelectionIcon } from "@phosphor-icons/react/dist/ssr/Selection";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import * as stylex from "@stylexjs/stylex";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMediaQuery } from "#src/hooks/use-media-query.ts";
import { useTheme } from "#src/hooks/use-theme.ts";
import { t } from "#src/i18n.ts";
import { border, color, font, space } from "#src/tokens.stylex.ts";
import type { CellPixels } from "./types";
import { useHistory } from "./use-history";
import type { GuideOptions } from "./utils/guides";
import { computeGuideFractions } from "./utils/guides";
import type { Rect } from "./utils/pixel-ops";
import {
  cloneCell,
  cropCell,
  eraseRect,
  flipCellH,
  flipCellV,
  floodFill,
  getPixel,
  normalizeRect,
  parseHex,
  pasteCellScaled,
  rgbaToHex,
  setPixel,
} from "./utils/pixel-ops";

type Tool =
  | "pencil"
  | "eraser"
  | "select"
  | "eyedropper"
  | "fill"
  | "bg-remove";

interface PixelEditorProps {
  /** Source-of-truth cell pixels — what was sliced from the source image. */
  baseCell: CellPixels;
  /**
   * The currently saved edit for this cell, or null if untouched. Drives
   * initial state when switching cells.
   */
  savedEdit: CellPixels | null;
  /** Called whenever the user makes a change. */
  onCommit: (next: CellPixels) => void;
  /** Called when the user clicks "revert" — drop the saved edit. */
  onRevert: () => void;
  /** Onion-skin overlay. */
  onionCell?: CellPixels | null;
  onionOpacity?: number;
  /** Optional sub-cell guides drawn over the canvas. */
  guides?: GuideOptions;
}

const DEFAULT_PALETTE = [
  "#000000",
  "#ffffff",
  "#f3eded",
  "#ff8000",
  "#a855f7",
  "#0ea5e9",
  "#10b981",
  "#fbbf24",
  "#ef4444",
  "#1ecc5a",
];

const RECENT_LIMIT = 8;
const TOLERANCE_DEFAULT = 32;
const MIN_SCALE = 1;
const MAX_SCALE = 64;
const HANDLE_SIZE = 10; // CSS px for the resize handle hit-area

interface Transform {
  scale: number; // CSS px per source pixel
  panX: number; // CSS px offset of the cell origin within the canvas
  panY: number;
}

/**
 * Selection state. `marquee` is just an outline over the current cell —
 * operations like Erase/Flip apply directly. `floating` means the rect's
 * pixels have been lifted: `previewBase` is the cell with that rect cleared,
 * `pixels` is the lifted content (always at its natural size), and `rect`
 * is where it'll land on Apply (potentially with a different w/h, in which
 * case the pixels get nearest-neighbor scaled).
 */
type Selection =
  | { mode: "marquee"; rect: Rect }
  | {
      mode: "floating";
      rect: Rect;
      pixels: CellPixels;
      previewBase: CellPixels;
    };

export function PixelEditor({
  baseCell,
  savedEdit,
  onCommit,
  onRevert,
  onionCell,
  onionOpacity = 0.3,
  guides,
}: PixelEditorProps) {
  // The component is remounted with `key={cellIndex}` on cell switches, so
  // history is naturally fresh per cell — no manual reset needed.
  const [initial] = useState<CellPixels>(() =>
    cloneCell(savedEdit ?? baseCell),
  );
  const history = useHistory<CellPixels>(initial);
  const { present, presentRef, push, undo, redo, canUndo, canRedo, reset } =
    history;

  const isFirstSyncRef = useRef(true);
  const skipNextSyncRef = useRef(false);
  useEffect(() => {
    if (isFirstSyncRef.current) {
      isFirstSyncRef.current = false;
      return;
    }
    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false;
      return;
    }
    onCommit(present);
  }, [present, onCommit]);

  const [tool, setTool] = useState<Tool>("pencil");
  const [activeColor, setActiveColor] = useState<string>("#000000");
  const [recent, setRecent] = useState<readonly string[]>([]);
  const [tolerance, setTolerance] = useState(TOLERANCE_DEFAULT);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [transform, setTransform] = useState<Transform | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Track effective theme (light/dark) so we can pick canvas-painted grid
  // and cell-border colors that contrast with whichever side of the theme
  // the user is on.
  const [themePref] = useTheme();
  const preferDark = useMediaQuery("(prefers-color-scheme: dark)", false);
  const isDark = themePref === "system" ? preferDark : themePref === "dark";
  const gridColor = isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.18)";
  const cellBorderColor = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.35)";

  // Canvas size tracks the container so the cell can be panned around inside
  // the wrapper at varying zoom without having to grow the canvas itself.
  useEffect(() => {
    const el = containerRef.current;
    if (el === null) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      setContainerSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  // Auto-fit transform when container or cell shape changes and there's no
  // user transform yet. Stored-deps pattern.
  const fitTransform = useMemo<Transform | null>(() => {
    if (containerSize.width === 0 || containerSize.height === 0) return null;
    const sx = Math.floor(containerSize.width / present.width);
    const sy = Math.floor(containerSize.height / present.height);
    const fit = Math.max(MIN_SCALE, Math.min(MAX_SCALE, Math.min(sx, sy)));
    return {
      scale: fit,
      panX: Math.floor((containerSize.width - present.width * fit) / 2),
      panY: Math.floor((containerSize.height - present.height * fit) / 2),
    };
  }, [containerSize, present.width, present.height]);

  const [prevFitKey, setPrevFitKey] = useState<string | null>(null);
  const fitKey =
    fitTransform === null
      ? null
      : `${String(containerSize.width)}x${String(containerSize.height)}@${String(present.width)}x${String(present.height)}`;
  if (fitKey !== prevFitKey && fitTransform !== null) {
    setPrevFitKey(fitKey);
    if (transform === null) setTransform(fitTransform);
  }

  const fitToView = useCallback(() => {
    if (fitTransform !== null) setTransform(fitTransform);
  }, [fitTransform]);

  // Drawing.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null || transform === null) return;
    if (containerSize.width === 0 || containerSize.height === 0) return;
    const dpr = typeof window === "undefined" ? 1 : window.devicePixelRatio;
    canvas.width = Math.floor(containerSize.width * dpr);
    canvas.height = Math.floor(containerSize.height * dpr);
    canvas.style.width = `${String(containerSize.width)}px`;
    canvas.style.height = `${String(containerSize.height)}px`;
    const ctx = canvas.getContext("2d");
    if (ctx === null) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, containerSize.width, containerSize.height);
    ctx.imageSmoothingEnabled = false;

    const { scale, panX, panY } = transform;
    const cellW = present.width;
    const cellH = present.height;

    // 1) Transparency checkerboard is painted by the canvas element's CSS
    // `background-image`, so it covers the entire viewport — including the
    // area outside the cell rect. That gives a steady visual anchor when
    // the user pans/zooms. The canvas itself stays transparent here; opaque
    // cell pixels drawn below will cover the pattern, and transparent
    // pixels (or the area outside the cell) let it show through.

    // Determine what the visible cell is — `previewBase` while a selection
    // is floating (the rect was lifted), otherwise just `present`.
    const visibleBase =
      selection !== null && selection.mode === "floating"
        ? selection.previewBase
        : present;

    // 2) Cell pixels (drawn via offscreen at native size, then nearest-
    // neighbor scaled). Alpha-blends naturally over the checker.
    const off =
      typeof OffscreenCanvas !== "undefined"
        ? new OffscreenCanvas(cellW, cellH)
        : null;
    const drawCell = (cell: CellPixels) => {
      if (off !== null) {
        const offCtx = off.getContext("2d");
        if (offCtx !== null) {
          offCtx.clearRect(0, 0, cellW, cellH);
          offCtx.putImageData(
            new ImageData(cell.data, cell.width, cell.height),
            0,
            0,
          );
          ctx.drawImage(off, panX, panY, cellW * scale, cellH * scale);
        }
      } else {
        for (let y = 0; y < cellH; y++) {
          for (let x = 0; x < cellW; x++) {
            const i = (y * cellW + x) * 4;
            const a = cell.data[i + 3];
            if (a === 0) continue;
            ctx.fillStyle = `rgba(${String(cell.data[i])}, ${String(cell.data[i + 1])}, ${String(cell.data[i + 2])}, ${String(a / 255)})`;
            ctx.fillRect(panX + x * scale, panY + y * scale, scale, scale);
          }
        }
      }
    };
    drawCell(visibleBase);

    // 3) Onion skin overlay (only when shape matches).
    if (
      onionCell !== null &&
      onionCell !== undefined &&
      onionCell.width === cellW &&
      onionCell.height === cellH
    ) {
      ctx.globalAlpha = onionOpacity;
      drawCell(onionCell);
      ctx.globalAlpha = 1;
    }

    // 4) Floating selection — draw the lifted pixels at the current rect,
    // scaled if w/h has changed via resize.
    if (selection !== null && selection.mode === "floating") {
      const r = selection.rect;
      const offFloat =
        typeof OffscreenCanvas !== "undefined"
          ? new OffscreenCanvas(selection.pixels.width, selection.pixels.height)
          : null;
      if (offFloat !== null) {
        const offCtx = offFloat.getContext("2d");
        if (offCtx !== null) {
          offCtx.putImageData(
            new ImageData(
              selection.pixels.data,
              selection.pixels.width,
              selection.pixels.height,
            ),
            0,
            0,
          );
          ctx.drawImage(
            offFloat,
            panX + r.x * scale,
            panY + r.y * scale,
            r.w * scale,
            r.h * scale,
          );
        }
      }
    }

    // 5) Pixel grid — only when the user has zoomed in past the threshold,
    // since at typical fit-view scales the grid lines just add visual noise
    // on top of the diagonal-hash transparency pattern.
    if (scale >= 24) {
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= cellW; x++) {
        const px = Math.round(panX + x * scale) + 0.5;
        ctx.moveTo(px, panY);
        ctx.lineTo(px, panY + cellH * scale);
      }
      for (let y = 0; y <= cellH; y++) {
        const py = Math.round(panY + y * scale) + 0.5;
        ctx.moveTo(panX, py);
        ctx.lineTo(panX + cellW * scale, py);
      }
      ctx.stroke();
    }

    // 6) Cell border — always visible so the user knows where the
    // editable area ends, especially when zoomed out.
    ctx.strokeStyle = cellBorderColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(
      Math.round(panX) + 0.5,
      Math.round(panY) + 0.5,
      cellW * scale,
      cellH * scale,
    );

    // 7) Sub-cell alignment guides.
    if (guides !== undefined) {
      const fractions = computeGuideFractions(guides);
      if (fractions.vertical.length > 0 || fractions.horizontal.length > 0) {
        ctx.strokeStyle = "rgba(251, 191, 36, 0.65)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        for (const fx of fractions.vertical) {
          const x = Math.round(panX + fx * cellW * scale) + 0.5;
          ctx.moveTo(x, panY);
          ctx.lineTo(x, panY + cellH * scale);
        }
        for (const fy of fractions.horizontal) {
          const y = Math.round(panY + fy * cellH * scale) + 0.5;
          ctx.moveTo(panX, y);
          ctx.lineTo(panX + cellW * scale, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // 8) Selection marquee + bottom-right resize handle.
    if (selection !== null) {
      const r = selection.rect;
      const sx = panX + r.x * scale;
      const sy = panY + r.y * scale;
      const sw = r.w * scale;
      const sh = r.h * scale;
      ctx.strokeStyle = "rgba(168, 85, 247, 0.95)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(Math.round(sx) + 0.5, Math.round(sy) + 0.5, sw, sh);
      ctx.setLineDash([]);

      // Resize handle at bottom-right.
      const hx = sx + sw;
      const hy = sy + sh;
      ctx.fillStyle = "rgba(168, 85, 247, 0.95)";
      ctx.fillRect(
        hx - HANDLE_SIZE / 2,
        hy - HANDLE_SIZE / 2,
        HANDLE_SIZE,
        HANDLE_SIZE,
      );
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.strokeRect(
        hx - HANDLE_SIZE / 2 + 0.5,
        hy - HANDLE_SIZE / 2 + 0.5,
        HANDLE_SIZE - 1,
        HANDLE_SIZE - 1,
      );
    }
  }, [
    present,
    transform,
    containerSize,
    onionCell,
    onionOpacity,
    guides,
    selection,
    gridColor,
    cellBorderColor,
  ]);

  const remember = useCallback((hex: string) => {
    setRecent((current) => {
      const next = [hex, ...current.filter((c) => c !== hex)];
      return next.slice(0, RECENT_LIMIT);
    });
  }, []);

  // Selection action helpers ------------------------------------------------

  /**
   * Commit a floating selection back into the cell at its current rect
   * (scaled if rect.w/h differ from the lifted pixels' natural size). For
   * marquee selections, this is a no-op. Either way, the selection is
   * cleared. Pushes a single history entry so the whole edit can be undone.
   */
  const commitSelection = useCallback(() => {
    if (selection === null) return;
    if (selection.mode === "floating") {
      const next = cloneCell(selection.previewBase);
      pasteCellScaled(
        next,
        selection.pixels,
        selection.rect.x,
        selection.rect.y,
        selection.rect.w,
        selection.rect.h,
      );
      push(next);
    }
    setSelection(null);
  }, [push, selection]);

  const cancelSelection = useCallback(() => {
    setSelection(null);
  }, []);

  const eraseSelection = useCallback(() => {
    if (selection === null) return;
    if (selection.mode === "floating") {
      // Already cleared in previewBase — just commit that.
      push(cloneCell(selection.previewBase));
    } else {
      const next = cloneCell(presentRef.current);
      eraseRect(next, selection.rect);
      push(next);
    }
    setSelection(null);
  }, [presentRef, push, selection]);

  const flipSelection = useCallback(
    (axis: "h" | "v") => {
      if (selection === null) return;
      if (selection.mode === "floating") {
        const next = cloneCell(selection.pixels);
        if (axis === "h") flipCellH(next);
        else flipCellV(next);
        setSelection({ ...selection, pixels: next });
        return;
      }
      // Marquee: lift, flip the lifted pixels, but keep them floating so the
      // user can still move/resize/erase.
      const cropped = cropCell(presentRef.current, selection.rect);
      if (axis === "h") flipCellH(cropped);
      else flipCellV(cropped);
      const previewBase = cloneCell(presentRef.current);
      eraseRect(previewBase, selection.rect);
      setSelection({
        mode: "floating",
        rect: selection.rect,
        pixels: cropped,
        previewBase,
      });
    },
    [presentRef, selection],
  );

  const copySelection = useCallback(() => {
    if (selection === null) return;
    // "Copy" duplicates the contents at a +2,+2 offset and leaves the
    // duplicate floating. The original stays in place.
    const offset = 2;
    const sourceCell =
      selection.mode === "floating" ? selection.pixels : presentRef.current;
    const sourceRect =
      selection.mode === "floating"
        ? { x: 0, y: 0, w: selection.pixels.width, h: selection.pixels.height }
        : selection.rect;
    const cropped = cropCell(sourceCell, sourceRect);
    // The previewBase needs to reflect the original still being present,
    // because we're DUPLICATING, not moving.
    const previewBase =
      selection.mode === "floating"
        ? // Bake the original lifted pixels back into previewBase before
          // creating the duplicate, otherwise we'd lose the original on
          // commit.
          (() => {
            const baked = cloneCell(selection.previewBase);
            pasteCellScaled(
              baked,
              selection.pixels,
              selection.rect.x,
              selection.rect.y,
              selection.rect.w,
              selection.rect.h,
            );
            return baked;
          })()
        : cloneCell(presentRef.current);
    setSelection({
      mode: "floating",
      rect: {
        x: selection.rect.x + offset,
        y: selection.rect.y + offset,
        w: selection.rect.w,
        h: selection.rect.h,
      },
      pixels: cropped,
      previewBase,
    });
  }, [presentRef, selection]);

  // Tool actions ------------------------------------------------------------

  const applyAtPixel = useCallback(
    (px: number, py: number, isDrag: boolean) => {
      const current = presentRef.current;
      const next = cloneCell(current);
      const rgba = parseHex(activeColor);
      const transparent = [0, 0, 0, 0] as const;

      if (tool === "pencil") {
        setPixel(next, px, py, rgba);
        push(next);
        if (!isDrag) remember(activeColor);
        return;
      }
      if (tool === "eraser") {
        setPixel(next, px, py, transparent);
        push(next);
        return;
      }
      if (tool === "eyedropper") {
        const sample = getPixel(current, px, py);
        if (sample === null) return;
        if (sample[3] === 0) return;
        const hex = rgbaToHex(sample[0], sample[1], sample[2]);
        setActiveColor(hex);
        remember(hex);
        return;
      }
      if (tool === "fill") {
        floodFill(next, px, py, rgba, 0);
        push(next);
        remember(activeColor);
        return;
      }
      // bg-remove
      floodFill(next, px, py, transparent, tolerance);
      push(next);
    },
    [activeColor, presentRef, push, remember, tool, tolerance],
  );

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

  /** Lift the current marquee selection to floating state. No-op otherwise. */
  const liftIfMarquee = (sel: Selection): Selection => {
    if (sel.mode === "floating") return sel;
    const cropped = cropCell(presentRef.current, sel.rect);
    const previewBase = cloneCell(presentRef.current);
    eraseRect(previewBase, sel.rect);
    return {
      mode: "floating",
      rect: sel.rect,
      pixels: cropped,
      previewBase,
    };
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

  // Wheel zoom — native non-passive listener so preventDefault stops the page
  // from scrolling.
  const transformRef = useRef(transform);
  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const onWheel = (event: WheelEvent) => {
      const current = transformRef.current;
      if (current === null) return;
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const cx = event.clientX - rect.left;
      const cy = event.clientY - rect.top;
      // Integer scale steps so pixels stay crisp.
      const dir = event.deltaY < 0 ? 1 : -1;
      const nextScale = Math.max(
        MIN_SCALE,
        Math.min(MAX_SCALE, current.scale + dir),
      );
      if (nextScale === current.scale) return;
      const px = (cx - current.panX) / current.scale;
      const py = (cy - current.panY) / current.scale;
      setTransform({
        scale: nextScale,
        panX: cx - px * nextScale,
        panY: cy - py * nextScale,
      });
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", onWheel);
    };
  }, []);

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const meta = event.metaKey || event.ctrlKey;
      if (meta) {
        const key = event.key.toLowerCase();
        if (key === "z" && !event.shiftKey) {
          event.preventDefault();
          undo();
          return;
        }
        if ((key === "z" && event.shiftKey) || key === "y") {
          event.preventDefault();
          redo();
          return;
        }
      }
      if (selection !== null) {
        if (event.key === "Escape") {
          event.preventDefault();
          cancelSelection();
        } else if (event.key === "Enter") {
          event.preventDefault();
          commitSelection();
        } else if (event.key === "Delete" || event.key === "Backspace") {
          event.preventDefault();
          eraseSelection();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [undo, redo, selection, cancelSelection, commitSelection, eraseSelection]);

  const switchTool = useCallback(
    (next: Tool) => {
      if (selection !== null) commitSelection();
      setTool(next);
    },
    [commitSelection, selection],
  );

  const cursorClass = (() => {
    if (tool === "select") return styles.canvasSelect;
    return styles.canvasPaint;
  })();

  const flipHLabel = t({ en: "Flip horizontal", zh: "水平翻转" });
  const flipVLabel = t({ en: "Flip vertical", zh: "垂直翻转" });
  const eraseLabel = t({ en: "Erase", zh: "擦除" });
  const copyLabel = t({ en: "Copy", zh: "复制" });
  const applyLabel = t({ en: "Apply", zh: "应用" });
  const cancelLabel = t({ en: "Cancel", zh: "取消" });

  return (
    <div css={styles.root}>
      <div
        css={styles.toolbar}
        role="toolbar"
        aria-label={t({ en: "Tools", zh: "工具" })}
      >
        <ToolButton
          icon={<PencilSimpleIcon size={18} weight="bold" />}
          label={t({ en: "Pencil", zh: "铅笔" })}
          active={tool === "pencil"}
          onClick={() => {
            switchTool("pencil");
          }}
          testId="tool-pencil"
        />
        <ToolButton
          icon={<EraserIcon size={18} weight="bold" />}
          label={t({ en: "Eraser", zh: "橡皮" })}
          active={tool === "eraser"}
          onClick={() => {
            switchTool("eraser");
          }}
          testId="tool-eraser"
        />
        <ToolButton
          icon={<SelectionIcon size={18} weight="bold" />}
          label={t({ en: "Range select", zh: "区域选择" })}
          active={tool === "select"}
          onClick={() => {
            switchTool("select");
          }}
          testId="tool-select"
        />
        <ToolButton
          icon={<EyedropperIcon size={18} weight="bold" />}
          label={t({ en: "Eyedropper", zh: "取色" })}
          active={tool === "eyedropper"}
          onClick={() => {
            switchTool("eyedropper");
          }}
          testId="tool-eyedropper"
        />
        <ToolButton
          icon={<PaintBucketIcon size={18} weight="bold" />}
          label={t({ en: "Fill", zh: "填充" })}
          active={tool === "fill"}
          onClick={() => {
            switchTool("fill");
          }}
          testId="tool-fill"
        />
        <ToolButton
          icon={<MagicWandIcon size={18} weight="bold" />}
          label={t({ en: "Remove background", zh: "去背景" })}
          active={tool === "bg-remove"}
          onClick={() => {
            switchTool("bg-remove");
          }}
          testId="tool-bg-remove"
        />
        <span css={styles.spacer} />
        <ToolButton
          icon={<FrameCornersIcon size={18} weight="bold" />}
          label={t({ en: "Fit view", zh: "适应视图" })}
          onClick={fitToView}
          testId="tool-fit"
        />
        <ToolButton
          icon={<ArrowUUpLeftIcon size={18} weight="bold" />}
          label={t({ en: "Undo", zh: "撤销" })}
          onClick={undo}
          disabled={!canUndo}
          testId="tool-undo"
        />
        <ToolButton
          icon={<ArrowUUpRightIcon size={18} weight="bold" />}
          label={t({ en: "Redo", zh: "重做" })}
          onClick={redo}
          disabled={!canRedo}
          testId="tool-redo"
        />
        <ToolButton
          icon={<ArrowCounterClockwiseIcon size={18} weight="bold" />}
          label={t({ en: "Revert", zh: "还原" })}
          onClick={() => {
            skipNextSyncRef.current = true;
            reset(cloneCell(baseCell));
            onRevert();
          }}
          testId="tool-revert"
        />
      </div>

      <div css={styles.colorRow}>
        <label css={styles.colorLabel}>
          <span>{t({ en: "Color", zh: "颜色" })}</span>
          <input
            type="color"
            value={activeColor}
            onChange={(event) => {
              setActiveColor(event.target.value);
            }}
            css={styles.colorInput}
            data-testid="color-input"
          />
        </label>
        <div css={styles.swatches}>
          {DEFAULT_PALETTE.map((hex) => (
            <button
              key={hex}
              type="button"
              css={[styles.swatch, activeColor === hex && styles.swatchActive]}
              style={{ backgroundColor: hex }}
              aria-label={hex}
              onClick={() => {
                setActiveColor(hex);
                remember(hex);
              }}
            />
          ))}
        </div>
        {recent.length > 0 ? (
          <div
            css={styles.swatches}
            aria-label={t({ en: "Recent colors", zh: "最近颜色" })}
          >
            {recent.map((hex) => (
              <button
                key={hex}
                type="button"
                css={[
                  styles.swatch,
                  activeColor === hex && styles.swatchActive,
                ]}
                style={{ backgroundColor: hex }}
                aria-label={hex}
                onClick={() => {
                  setActiveColor(hex);
                }}
              />
            ))}
          </div>
        ) : null}
        {tool === "bg-remove" ? (
          <label css={styles.colorLabel}>
            <span>{t({ en: "Tolerance", zh: "容差" })}</span>
            <input
              type="range"
              min={0}
              max={128}
              value={tolerance}
              onChange={(event) => {
                setTolerance(Number(event.target.value));
              }}
              data-testid="tolerance"
            />
            <span css={styles.toleranceValue}>{tolerance}</span>
          </label>
        ) : null}
      </div>

      <div ref={containerRef} css={styles.canvasArea}>
        <canvas
          ref={canvasRef}
          css={[styles.canvas, cursorClass]}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          data-testid="pixel-canvas"
        />
        {selection !== null ? (
          <div
            css={styles.selectionBar}
            role="toolbar"
            aria-label={t({ en: "Selection actions", zh: "选区操作" })}
          >
            <SelectionButton
              icon={<TrashIcon size={16} weight="bold" />}
              label={eraseLabel}
              onClick={eraseSelection}
              testId="selection-erase"
            />
            <SelectionButton
              icon={<CopyIcon size={16} weight="bold" />}
              label={copyLabel}
              onClick={copySelection}
              testId="selection-copy"
            />
            <SelectionButton
              icon={<FlipHorizontalIcon size={16} weight="bold" />}
              label={flipHLabel}
              onClick={() => {
                flipSelection("h");
              }}
              testId="selection-flip-h"
            />
            <SelectionButton
              icon={<FlipVerticalIcon size={16} weight="bold" />}
              label={flipVLabel}
              onClick={() => {
                flipSelection("v");
              }}
              testId="selection-flip-v"
            />
            <span css={styles.selectionDivider} aria-hidden="true" />
            <SelectionButton
              icon={<CheckIcon size={16} weight="bold" />}
              label={applyLabel}
              onClick={commitSelection}
              testId="selection-apply"
              variant="primary"
            />
            <SelectionButton
              icon={<XIcon size={16} weight="bold" />}
              label={cancelLabel}
              onClick={cancelSelection}
              testId="selection-cancel"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  testId?: string;
}

function ToolButton({
  icon,
  label,
  active,
  disabled,
  onClick,
  testId,
}: ToolButtonProps) {
  return (
    <button
      type="button"
      css={[styles.toolButton, active && styles.toolButtonActive]}
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      data-testid={testId}
    >
      {icon}
    </button>
  );
}

interface SelectionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  testId?: string;
  variant?: "primary";
}

function SelectionButton({
  icon,
  label,
  onClick,
  testId,
  variant,
}: SelectionButtonProps) {
  return (
    <button
      type="button"
      css={[
        styles.selectionButton,
        variant === "primary" && styles.selectionButtonPrimary,
      ]}
      onClick={onClick}
      data-testid={testId}
    >
      <span css={styles.selectionIcon} aria-hidden="true">
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
    height: "100%",
    minHeight: 0,
  },
  toolbar: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: space._1,
    padding: space._2,
    backgroundColor: color.backgroundRaised,
    border: `1px solid ${color.border}`,
    borderRadius: border.radius_2,
  },
  spacer: {
    flex: "1",
  },
  toolButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    border: `1px solid ${color.border}`,
    borderRadius: border.radius_2,
    backgroundColor: {
      default: color.backgroundMain,
      ":hover:not(:disabled)": color.backgroundHover,
    },
    color: color.textMain,
    cursor: { default: "pointer", ":disabled": "not-allowed" },
    opacity: { default: 1, ":disabled": 0.4 },
  },
  toolButtonActive: {
    backgroundColor: color.brandPixelCreatureCreator,
    color: color.textOnActive,
    borderColor: color.brandPixelCreatureCreator,
  },
  colorRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: space._2,
    padding: space._2,
    backgroundColor: color.backgroundRaised,
    border: `1px solid ${color.border}`,
    borderRadius: border.radius_2,
  },
  colorLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: space._1,
    fontSize: font.uiBodySmall,
    color: color.textMuted,
  },
  colorInput: {
    width: "32px",
    height: "32px",
    padding: 0,
    border: `1px solid ${color.border}`,
    borderRadius: border.radius_2,
    backgroundColor: "transparent",
    cursor: "pointer",
  },
  swatches: {
    display: "flex",
    gap: "2px",
  },
  swatch: {
    width: "24px",
    height: "24px",
    border: `1px solid ${color.border}`,
    borderRadius: "4px",
    cursor: "pointer",
    padding: 0,
  },
  swatchActive: {
    outline: `2px solid ${color.brandPixelCreatureCreator}`,
    outlineOffset: "1px",
  },
  toleranceValue: {
    minWidth: "2.5em",
    textAlign: "right",
    fontSize: font.uiBodySmall,
    color: color.textMain,
    fontVariantNumeric: "tabular-nums",
  },
  canvasArea: {
    position: "relative",
    backgroundColor: color.backgroundRaised,
    border: `1px solid ${color.border}`,
    borderRadius: border.radius_3,
    flex: "1",
    minHeight: 0,
    overflow: "hidden",
  },
  canvas: {
    display: "block",
    width: "100%",
    height: "100%",
    touchAction: "none",
    imageRendering: "pixelated",
    backgroundColor: color.backgroundMain,
    backgroundImage: `linear-gradient(45deg, ${color.border} 25%, transparent 25%), linear-gradient(-45deg, ${color.border} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${color.border} 75%), linear-gradient(-45deg, transparent 75%, ${color.border} 75%)`,
    backgroundSize: "16px 16px",
    backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
  },
  canvasPaint: {
    cursor: "crosshair",
  },
  canvasSelect: {
    cursor: "cell",
  },
  selectionBar: {
    position: "absolute",
    insetBlockStart: space._2,
    insetInlineStart: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    alignItems: "center",
    gap: "2px",
    padding: "4px",
    backgroundColor: color.backgroundMain,
    border: `1px solid ${color.border}`,
    borderRadius: border.radius_2,
    boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
    flexWrap: "wrap",
    maxInlineSize: "calc(100% - 24px)",
    justifyContent: "center",
  },
  selectionButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    paddingBlock: "4px",
    paddingInline: space._1,
    backgroundColor: {
      default: "transparent",
      ":hover": color.backgroundHover,
    },
    color: color.textMain,
    border: "none",
    borderRadius: border.radius_1,
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  selectionButtonPrimary: {
    backgroundColor: {
      default: color.brandPixelCreatureCreator,
      ":hover": color.controlActive,
    },
    color: color.textOnActive,
  },
  selectionIcon: {
    display: "inline-flex",
  },
  selectionDivider: {
    width: "1px",
    height: "18px",
    backgroundColor: color.border,
    marginInline: "2px",
  },
});
