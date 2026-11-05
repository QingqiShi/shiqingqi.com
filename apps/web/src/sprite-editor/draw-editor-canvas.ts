import { computeGuideFractions } from "./compute-guide-fractions";
import type { CellPixels, GuideOptions, Selection, Transform } from "./types";

export const HANDLE_SIZE = 10; // CSS px for the resize handle hit-area

interface DrawEditorCanvasOptions {
  present: CellPixels;
  transform: Transform;
  onionCell: CellPixels | null | undefined;
  onionOpacity: number;
  guides: GuideOptions | undefined;
  selection: Selection | null;
  gridColor: string;
  cellBorderColor: string;
  accentStroke: string;
}

export function drawEditorCanvas(
  ctx: CanvasRenderingContext2D,
  {
    present,
    transform,
    onionCell,
    onionOpacity,
    guides,
    selection,
    gridColor,
    cellBorderColor,
    accentStroke,
  }: DrawEditorCanvasOptions,
) {
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
    ctx.strokeStyle = accentStroke;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(Math.round(sx) + 0.5, Math.round(sy) + 0.5, sw, sh);
    ctx.setLineDash([]);

    // Resize handle at bottom-right.
    const hx = sx + sw;
    const hy = sy + sh;
    ctx.fillStyle = accentStroke;
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
}
