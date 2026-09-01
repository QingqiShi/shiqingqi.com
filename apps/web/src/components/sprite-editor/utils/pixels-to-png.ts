import { makeCanvas } from "#src/utils/make-canvas.ts";
import type { CellPixels } from "../types";

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
