"use client";

import * as stylex from "@stylexjs/stylex";
import { color } from "@tuja/ui/color.stylex";
import { useResolvedTheme } from "@tuja/ui/hooks/use-resolved-theme";
import { purple } from "@tuja/ui/palette/purple.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { border, rhythm, shadow } from "@tuja/ui/tokens.stylex";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { parseHex } from "#src/pixel-art/parse-hex.ts";
import { cloneCell } from "#src/sprite-editor/pixel-ops/clone-cell.ts";
import { floodFill } from "#src/sprite-editor/pixel-ops/flood-fill.ts";
import { getPixel } from "#src/sprite-editor/pixel-ops/get-pixel.ts";
import { rgbaToHex } from "#src/sprite-editor/pixel-ops/rgba-to-hex.ts";
import { setPixel } from "#src/sprite-editor/pixel-ops/set-pixel.ts";
import { ColorRow } from "./color-row";
import { drawEditorCanvas } from "./draw-editor-canvas";
import { EditorToolbar } from "./editor-toolbar";
import { isEditableTarget } from "./is-editable-target";
import { prepareCanvas } from "./prepare-canvas";
import { SelectionBar } from "./selection-bar";
import type { CellPixels, GuideOptions, Tool } from "./types";
import { useCanvasPointer } from "./use-canvas-pointer";
import { useCanvasViewport, useWheelZoom } from "./use-canvas-viewport";
import { useEditorSelection } from "./use-editor-selection";
import { useHistory } from "./use-history";

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

const RECENT_LIMIT = 8;
const TOLERANCE_DEFAULT = 32;

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
  const {
    present,
    presentRef,
    push,
    replace,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
  } = history;

  const commitPresent = useEffectEvent(onCommit);
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
    commitPresent(present);
  }, [present]);

  const [tool, setTool] = useState<Tool>("pencil");
  const [activeColor, setActiveColor] = useState<string>("#000000");
  const [recent, setRecent] = useState<readonly string[]>([]);
  const [tolerance, setTolerance] = useState(TOLERANCE_DEFAULT);
  const {
    selection,
    setSelection,
    commitSelection,
    cancelSelection,
    eraseSelection,
    flipSelection,
    copySelection,
    liftIfMarquee,
  } = useEditorSelection({ presentRef, push });
  const { transform, setTransform, containerRef, containerSize, fitToView } =
    useCanvasViewport(present);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Track effective theme (light/dark) so we can pick canvas-painted grid
  // and cell-border colors that contrast with whichever side of the theme
  // the user is on.
  const isDark = useResolvedTheme() === "dark";
  const gridColor = isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.18)";
  const cellBorderColor = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.35)";
  // The selection accent painted directly on the canvas — kept in step with
  // the `accent` token (purple._30 light / purple._50 dark).
  const accentStroke = isDark ? purple._50 : purple._30;

  // Drawing.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null || transform === null) return;
    if (containerSize.width === 0 || containerSize.height === 0) return;
    const ctx = prepareCanvas(
      canvas,
      containerSize.width,
      containerSize.height,
    );
    if (ctx === null) return;

    drawEditorCanvas(ctx, {
      present,
      transform,
      onionCell,
      onionOpacity,
      guides,
      selection,
      gridColor,
      cellBorderColor,
      accentStroke,
    });
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
    accentStroke,
  ]);

  const remember = (hex: string) => {
    setRecent((current) => {
      const next = [hex, ...current.filter((c) => c !== hex)];
      return next.slice(0, RECENT_LIMIT);
    });
  };

  // Tool actions ------------------------------------------------------------

  const applyAtPixel = (px: number, py: number, isDrag: boolean) => {
    const current = presentRef.current;
    const next = cloneCell(current);
    const rgba = parseHex(activeColor);
    const transparent = [0, 0, 0, 0] as const;

    // Pencil/eraser drags coalesce into a single undo step: pointer-down
    // pushes one entry, every subsequent pointer-move replaces present
    // in-place. Ctrl+Z then restores the cell to its pre-stroke state in
    // one go instead of one pixel at a time.
    const commit = isDrag ? replace : push;

    if (tool === "pencil") {
      setPixel(next, px, py, rgba);
      commit(next);
      if (!isDrag) remember(activeColor);
      return;
    }
    if (tool === "eraser") {
      setPixel(next, px, py, transparent);
      commit(next);
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
  };

  const { handlePointerDown, handlePointerMove, handlePointerUp } =
    useCanvasPointer({
      present,
      tool,
      transform,
      setTransform,
      selection,
      setSelection,
      commitSelection,
      liftIfMarquee,
      applyAtPixel,
    });

  useWheelZoom(canvasRef, transform, setTransform);

  // Keyboard shortcuts.
  const onKey = useEffectEvent((event: KeyboardEvent) => {
    // Don't hijack keys when the user is typing in a form field or
    // contenteditable — Ctrl+Z would clobber native input undo, Backspace /
    // Delete / Enter / Escape would steal keystrokes from inputs like the
    // grid-controls sidebar or the in-editor color/tolerance pickers.
    if (
      isEditableTarget(event.target) ||
      isEditableTarget(document.activeElement)
    ) {
      return;
    }
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
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      onKey(event);
    };
    window.addEventListener("keydown", listener);
    return () => {
      window.removeEventListener("keydown", listener);
    };
  }, []);

  const switchTool = (next: Tool) => {
    if (selection !== null) commitSelection();
    setTool(next);
  };

  const cursorClass = (() => {
    if (tool === "select") return styles.canvasSelect;
    return styles.canvasPaint;
  })();

  return (
    <div css={styles.root}>
      <EditorToolbar
        tool={tool}
        onSwitchTool={switchTool}
        onFit={fitToView}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        onRevert={() => {
          skipNextSyncRef.current = true;
          reset(cloneCell(baseCell));
          onRevert();
        }}
      />

      <ColorRow
        tool={tool}
        activeColor={activeColor}
        onColorChange={setActiveColor}
        recent={recent}
        onRemember={remember}
        tolerance={tolerance}
        onToleranceChange={setTolerance}
      />

      <div ref={containerRef} css={[corner.radius_3, styles.canvasArea]}>
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
          <SelectionBar
            onErase={eraseSelection}
            onCopy={copySelection}
            onFlip={flipSelection}
            onApply={commitSelection}
            onCancel={cancelSelection}
          />
        ) : null}
      </div>
    </div>
  );
}

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: rhythm.item,
    height: "100%",
    minHeight: 0,
  },
  canvasArea: {
    position: "relative",
    backgroundColor: color.bgSurface,
    border: `${border.size_1} solid ${color.border}`,
    boxShadow: shadow.inset,
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
    backgroundColor: color.bgCanvas,
    backgroundImage: `linear-gradient(45deg, ${color.bgNeutralSubtle} 25%, transparent 25%), linear-gradient(-45deg, ${color.bgNeutralSubtle} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${color.bgNeutralSubtle} 75%), linear-gradient(-45deg, transparent 75%, ${color.bgNeutralSubtle} 75%)`,
    backgroundSize: "16px 16px",
    backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
  },
  canvasPaint: {
    cursor: "crosshair",
  },
  canvasSelect: {
    cursor: "cell",
  },
});
