"use client";

import * as stylex from "@stylexjs/stylex";
import { useEffect, useId, useRef, useState } from "react";
import { t } from "#src/i18n.ts";
import { border, color } from "#src/tokens.stylex.ts";
import type { GridConfig, SourceImage } from "./types";

interface SourceCanvasProps {
  source: SourceImage;
  grid: GridConfig;
  selectedCell: number | null;
  onCellSelect: (index: number | null) => void;
  /** Optional overlay drawn over the grid (e.g. sub-cell guides in Phase 3). */
  drawOverlay?: (
    ctx: CanvasRenderingContext2D,
    pixelToCanvas: (x: number, y: number) => readonly [number, number],
    pixelsPerUnit: number,
  ) => void;
}

interface ViewTransform {
  /** Top-left of the source image in canvas-pixel space. */
  panX: number;
  panY: number;
  /** Source pixels per canvas pixel. */
  scale: number;
}

const MIN_SCALE = 0.05;
const MAX_SCALE = 32;

export function SourceCanvas({
  source,
  grid,
  selectedCell,
  onCellSelect,
  drawOverlay,
}: SourceCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [transform, setTransform] = useState<ViewTransform | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStateRef = useRef<{
    pointerId: number;
    startCanvasX: number;
    startCanvasY: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);
  const headingId = useId();

  // Track container size with ResizeObserver — canvas size in CSS pixels
  // drives the device-pixel buffer size below.
  useEffect(() => {
    const el = containerRef.current;
    if (el === null) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const rect = entry.contentRect;
      setViewport({ width: rect.width, height: rect.height });
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  // Reset transform whenever the source or viewport size changes — fit the
  // image into the available area. Stored-deps pattern so the reset happens
  // during the render that detects the change, rather than in an effect
  // (avoids the react-hooks/set-state-in-effect cascade).
  const [prevFit, setPrevFit] = useState<{
    source: SourceImage | null;
    width: number;
    height: number;
  }>({ source: null, width: 0, height: 0 });
  if (
    prevFit.source !== source ||
    prevFit.width !== viewport.width ||
    prevFit.height !== viewport.height
  ) {
    setPrevFit({
      source,
      width: viewport.width,
      height: viewport.height,
    });
    if (viewport.width > 0 && viewport.height > 0) {
      const scaleX = viewport.width / source.width;
      const scaleY = viewport.height / source.height;
      const fit = Math.min(scaleX, scaleY) * 0.95;
      const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, fit));
      const drawnW = source.width * scale;
      const drawnH = source.height * scale;
      setTransform({
        panX: (viewport.width - drawnW) / 2,
        panY: (viewport.height - drawnH) / 2,
        scale,
      });
    }
  }

  // Render whenever the source, transform, grid, or selection changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null || transform === null) return;
    if (viewport.width === 0 || viewport.height === 0) return;
    const dpr = typeof window === "undefined" ? 1 : window.devicePixelRatio;
    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    canvas.style.width = `${String(viewport.width)}px`;
    canvas.style.height = `${String(viewport.height)}px`;
    const ctx = canvas.getContext("2d");
    if (ctx === null) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, viewport.width, viewport.height);

    // Transparency checkerboard is painted by the container's CSS background
    // (theme-aware) so it shows through transparent regions of the source.

    // Source image.
    ctx.imageSmoothingEnabled = false;
    const drawnW = source.width * transform.scale;
    const drawnH = source.height * transform.scale;
    ctx.drawImage(
      source.bitmap,
      transform.panX,
      transform.panY,
      drawnW,
      drawnH,
    );

    const pixelToCanvas = (x: number, y: number): readonly [number, number] => [
      transform.panX + x * transform.scale,
      transform.panY + y * transform.scale,
    ];

    // Grid cell outlines — each cell drawn as its own rectangle so gaps
    // between cells are visually obvious.
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(168, 85, 247, 0.85)";
    const cellPitchX = grid.cellWidth + grid.gapX;
    const cellPitchY = grid.cellHeight + grid.gapY;
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const [x0, y0] = pixelToCanvas(
          grid.offsetX + c * cellPitchX,
          grid.offsetY + r * cellPitchY,
        );
        const w = grid.cellWidth * transform.scale;
        const h = grid.cellHeight * transform.scale;
        ctx.strokeRect(Math.round(x0) + 0.5, Math.round(y0) + 0.5, w, h);
      }
    }

    // Selection highlight.
    if (selectedCell !== null) {
      const col = selectedCell % grid.cols;
      const row = Math.floor(selectedCell / grid.cols);
      const [x0, y0] = pixelToCanvas(
        grid.offsetX + col * cellPitchX,
        grid.offsetY + row * cellPitchY,
      );
      const w = grid.cellWidth * transform.scale;
      const h = grid.cellHeight * transform.scale;
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#fbbf24";
      ctx.strokeRect(Math.round(x0) - 1, Math.round(y0) - 1, w + 2, h + 2);
    }

    if (drawOverlay !== undefined) {
      drawOverlay(ctx, pixelToCanvas, transform.scale);
    }
  }, [
    source,
    transform,
    viewport.width,
    viewport.height,
    grid,
    selectedCell,
    drawOverlay,
  ]);

  const canvasToImage = (
    canvasX: number,
    canvasY: number,
  ): readonly [number, number] | null => {
    if (transform === null) return null;
    const ix = (canvasX - transform.panX) / transform.scale;
    const iy = (canvasY - transform.panY) / transform.scale;
    return [ix, iy];
  };

  // Native non-passive wheel listener so preventDefault() actually stops the
  // page from scrolling while the user zooms. React's JSX `onWheel` is
  // attached as passive in modern browsers, which silently swallows
  // event.preventDefault().
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
      const factor = Math.exp(-event.deltaY * 0.0015);
      const nextScale = Math.max(
        MIN_SCALE,
        Math.min(MAX_SCALE, current.scale * factor),
      );
      // Anchor zoom on the cursor: the source-space point under the cursor
      // should stay under the cursor after the scale change.
      const ix = (cx - current.panX) / current.scale;
      const iy = (cy - current.panY) / current.scale;
      setTransform({
        scale: nextScale,
        panX: cx - ix * nextScale,
        panY: cy - iy * nextScale,
      });
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", onWheel);
    };
  }, []);

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (transform === null) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const cx = event.clientX - rect.left;
    const cy = event.clientY - rect.top;

    // Middle-click or Shift+left-click pans; plain left-click selects a cell.
    const wantsPan = event.button === 1 || event.shiftKey;
    if (wantsPan || event.button !== 0) {
      event.currentTarget.setPointerCapture(event.pointerId);
      panStateRef.current = {
        pointerId: event.pointerId,
        startCanvasX: cx,
        startCanvasY: cy,
        startPanX: transform.panX,
        startPanY: transform.panY,
      };
      setIsPanning(true);
      return;
    }

    const imagePoint = canvasToImage(cx, cy);
    if (imagePoint === null) return;
    const [ix, iy] = imagePoint;
    const localX = ix - grid.offsetX;
    const localY = iy - grid.offsetY;
    const pitchX = grid.cellWidth + grid.gapX;
    const pitchY = grid.cellHeight + grid.gapY;
    const col = Math.floor(localX / pitchX);
    const row = Math.floor(localY / pitchY);
    if (col < 0 || col >= grid.cols || row < 0 || row >= grid.rows) {
      onCellSelect(null);
      return;
    }
    // Treat clicks on the gap (between cell edges) as misses so users can't
    // select what isn't drawable.
    const xWithinPitch = localX - col * pitchX;
    const yWithinPitch = localY - row * pitchY;
    if (xWithinPitch > grid.cellWidth || yWithinPitch > grid.cellHeight) {
      onCellSelect(null);
      return;
    }
    onCellSelect(row * grid.cols + col);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const pan = panStateRef.current;
    if (pan === null || transform === null) return;
    if (event.pointerId !== pan.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const cx = event.clientX - rect.left;
    const cy = event.clientY - rect.top;
    setTransform({
      scale: transform.scale,
      panX: pan.startPanX + (cx - pan.startCanvasX),
      panY: pan.startPanY + (cy - pan.startCanvasY),
    });
  };

  const endPan = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const pan = panStateRef.current;
    if (pan === null) return;
    if (event.pointerId !== pan.pointerId) return;
    panStateRef.current = null;
    setIsPanning(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <section ref={containerRef} css={styles.root} aria-labelledby={headingId}>
      <h2 id={headingId} css={styles.srOnly}>
        {t({ en: "Source viewport", zh: "源图视图" })}
      </h2>
      <canvas
        ref={canvasRef}
        css={[styles.canvas, isPanning && styles.panning]}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        data-testid="source-canvas"
      />
    </section>
  );
}

const styles = stylex.create({
  root: {
    position: "relative",
    width: "100%",
    height: "100%",
    minHeight: "320px",
    backgroundColor: color.backgroundMain,
    backgroundImage: `linear-gradient(45deg, ${color.border} 25%, transparent 25%), linear-gradient(-45deg, ${color.border} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${color.border} 75%), linear-gradient(-45deg, transparent 75%, ${color.border} 75%)`,
    backgroundSize: "16px 16px",
    backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
    borderRadius: border.radius_3,
    border: `1px solid ${color.border}`,
    overflow: "hidden",
  },
  canvas: {
    display: "block",
    width: "100%",
    height: "100%",
    cursor: "crosshair",
    touchAction: "none",
  },
  panning: {
    cursor: "grabbing",
  },
  srOnly: {
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: 0,
    margin: "-1px",
    overflow: "hidden",
    clipPath: "inset(50%)",
    whiteSpace: "nowrap",
    borderWidth: 0,
    insetBlockStart: 0,
    insetInlineStart: 0,
  },
});
