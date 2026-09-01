import { makeCanvas } from "#src/utils/make-canvas.ts";
import type { CellPixels, GridConfig, OutputConfig } from "../types";

/**
 * Slice a single grid cell out of the source image and downsample to the
 * output resolution. Uses nearest-neighbor (`imageSmoothingEnabled = false`)
 * so 313×313 → 42×42 produces a clean pixel-art result.
 *
 * Returns the rendered output as `CellPixels` (RGBA byte array). Callers
 * convert to PNG via `pixelsToPng`.
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
