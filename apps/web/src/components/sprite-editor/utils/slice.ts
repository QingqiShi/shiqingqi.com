import type { CellPixels, GridConfig, OutputConfig } from "../types";
import { makeCanvas } from "./canvas";

/**
 * Slice a single grid cell out of the source image and downsample to the
 * output resolution. Uses nearest-neighbor (`imageSmoothingEnabled = false`)
 * so 313×313 → 42×42 produces a clean pixel-art result.
 *
 * Returns the rendered output as `CellPixels` (RGBA byte array). Callers
 * convert to PNG via `cellsToPng`.
 */
export function sliceCell(
  source: ImageBitmap | HTMLCanvasElement,
  grid: GridConfig,
  output: OutputConfig,
  col: number,
  row: number,
): CellPixels | null {
  const handle = makeCanvas(output.width, output.height);
  if (handle === null) return null;
  try {
    const { ctx } = handle;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, output.width, output.height);
    ctx.drawImage(
      source,
      grid.offsetX + col * (grid.cellWidth + grid.gapX),
      grid.offsetY + row * (grid.cellHeight + grid.gapY),
      grid.cellWidth,
      grid.cellHeight,
      0,
      0,
      output.width,
      output.height,
    );
    const imageData = ctx.getImageData(0, 0, output.width, output.height);
    return {
      width: output.width,
      height: output.height,
      data: imageData.data,
    };
  } finally {
    handle.cleanup();
  }
}

/** Convert a `CellPixels` back to a PNG `Blob`. */
export async function pixelsToPng(cell: CellPixels): Promise<Blob | null> {
  const handle = makeCanvas(cell.width, cell.height);
  if (handle === null) return null;
  try {
    const { ctx } = handle;
    const imageData = new ImageData(cell.data, cell.width, cell.height);
    ctx.putImageData(imageData, 0, 0);
    return await handle.toBlob();
  } finally {
    handle.cleanup();
  }
}

/** Trigger a browser download for a Blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
