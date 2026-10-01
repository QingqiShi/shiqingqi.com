import type { CellPixels } from "./types";

/**
 * Draw `cell` into a `size` × `size` CSS-pixel square at the largest integer
 * scale that fits, centered. Integer scaling avoids the fractional-pixel
 * artifacts of CSS-stretching a small backing buffer.
 */
export function drawCellCentered(
  ctx: CanvasRenderingContext2D,
  cell: CellPixels,
  size: number,
): void {
  const fit = Math.min(size / cell.width, size / cell.height);
  const scale = Math.max(1, Math.floor(fit));
  const drawnW = cell.width * scale;
  const drawnH = cell.height * scale;
  const dx = Math.floor((size - drawnW) / 2);
  const dy = Math.floor((size - drawnH) / 2);
  const imageData = new ImageData(cell.data, cell.width, cell.height);
  const off =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(cell.width, cell.height)
      : null;
  if (off !== null) {
    const offCtx = off.getContext("2d");
    if (offCtx !== null) {
      offCtx.putImageData(imageData, 0, 0);
      ctx.drawImage(off, dx, dy, drawnW, drawnH);
    }
  } else {
    ctx.putImageData(imageData, dx, dy);
  }
}
