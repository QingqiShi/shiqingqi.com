"use client";

import { useEffect, useRef } from "react";

interface PixelLayerProps {
  tile: string[];
  palette: string[];
  scale?: number;
  className?: string;
  ariaHidden?: boolean;
}

/**
 * Static pixel-art canvas. Renders one tile (rectangular grid of palette
 * indices) at integer scale. Animation is the parent's job — this layer
 * never schedules a frame.
 *
 * DPR handling: the visible canvas backing store is multiplied by
 * `devicePixelRatio` and we `ctx.scale(dpr, dpr)` once. We listen for the
 * `resolution` media query so dragging across displays of different DPR
 * picks up the new value without a remount.
 */
export function PixelLayer({
  tile,
  palette,
  scale = 8,
  className,
  ariaHidden = true,
}: PixelLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;

    const rows = tile.length;
    if (rows === 0) return;
    const cols = tile[0].length;
    if (cols === 0) return;

    let cancelled = false;

    const draw = () => {
      if (cancelled) return;
      const dpr = window.devicePixelRatio;
      const cssWidth = cols * scale;
      const cssHeight = rows * scale;

      canvas.style.width = `${String(cssWidth)}px`;
      canvas.style.height = `${String(cssHeight)}px`;
      canvas.width = Math.round(cssWidth * dpr);
      canvas.height = Math.round(cssHeight * dpr);

      const ctx = canvas.getContext("2d");
      if (ctx === null) return;

      // Build the source ImageData at art-pixel resolution.
      const source = new ImageData(cols, rows);
      const data = source.data;
      for (let r = 0; r < rows; r += 1) {
        const row = tile[r];
        for (let c = 0; c < cols; c += 1) {
          const ch = row[c];
          const i = (r * cols + c) * 4;
          if (ch === " ") {
            data[i] = 0;
            data[i + 1] = 0;
            data[i + 2] = 0;
            data[i + 3] = 0;
            continue;
          }
          const colorIndex = parseInt(ch, 16);
          if (Number.isNaN(colorIndex) || colorIndex >= palette.length) {
            data[i + 3] = 0;
            continue;
          }
          const hex = palette[colorIndex];
          // Expect "#rrggbb"; tolerate missing/short by treating as transparent.
          if (hex.length !== 7) {
            data[i + 3] = 0;
            continue;
          }
          data[i] = parseInt(hex.slice(1, 3), 16);
          data[i + 1] = parseInt(hex.slice(3, 5), 16);
          data[i + 2] = parseInt(hex.slice(5, 7), 16);
          data[i + 3] = 255;
        }
      }

      // Stage the source on an offscreen canvas, then drawImage scaled.
      const offscreen = document.createElement("canvas");
      offscreen.width = cols;
      offscreen.height = rows;
      const offCtx = offscreen.getContext("2d");
      if (offCtx === null) return;
      offCtx.putImageData(source, 0, 0);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      ctx.scale(dpr, dpr);
      ctx.drawImage(offscreen, 0, 0, cssWidth, cssHeight);
    };

    draw();

    // Re-draw when DPR changes (drag between displays of different DPR).
    // `matchMedia` may be absent in some test environments — that path
    // simply skips the listener (DPR is read fresh on each `draw()` call).
    //
    // The DPR-pinned `(resolution: Xdppx)` query only fires when leaving X.
    // After a transition (1 → 2) the old listener never fires again, so we
    // re-arm a fresh query keyed off the new `devicePixelRatio` after each
    // change. `currentQuery` tracks the active listener so cleanup tears it
    // down whichever DPR we currently have.
    let currentQuery: MediaQueryList | null = null;
    const onChange = () => {
      draw();
      arm();
    };
    const arm = () => {
      if (typeof window.matchMedia !== "function") return;
      if (currentQuery !== null) {
        currentQuery.removeEventListener("change", onChange);
      }
      currentQuery = window.matchMedia(
        `(resolution: ${String(window.devicePixelRatio)}dppx)`,
      );
      currentQuery.addEventListener("change", onChange);
    };
    arm();

    return () => {
      cancelled = true;
      currentQuery?.removeEventListener("change", onChange);
    };
  }, [tile, palette, scale]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden={ariaHidden}
      // `imageRendering: pixelated` keeps the upscaled bitmap crisp;
      // without it browsers smooth the canvas back into mush.
      style={{ imageRendering: "pixelated" }}
    />
  );
}
