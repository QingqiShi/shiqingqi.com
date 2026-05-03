import type { CellPixels } from "../types";
import { makeCanvas } from "./canvas";

export interface SpriteSheetManifest {
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  /** Per-frame durations in milliseconds, in playback order. */
  durations: readonly number[];
}

export interface SpriteSheetExport {
  png: Blob;
  manifest: SpriteSheetManifest;
}

/**
 * Composite an animation's frames into a horizontal sprite sheet PNG, plus a
 * JSON-friendly manifest describing the frame size and per-frame durations.
 *
 * Frames must all share the same dimensions (the same `OutputConfig` produced
 * them); empty inputs return null.
 */
export async function exportSpriteSheet(
  frames: readonly { cell: CellPixels; duration: number }[],
): Promise<SpriteSheetExport | null> {
  if (frames.length === 0) return null;
  const first = frames[0].cell;
  const sheetW = first.width * frames.length;
  const sheetH = first.height;
  const handle = makeCanvas(sheetW, sheetH);
  if (handle === null) return null;
  try {
    const { ctx } = handle;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, sheetW, sheetH);
    for (let i = 0; i < frames.length; i++) {
      const { cell } = frames[i];
      // Frames coming in might mismatch if grid changed mid-build — bail
      // rather than stretch them, since the manifest assumes uniform size.
      if (cell.width !== first.width || cell.height !== first.height) {
        return null;
      }
      const imageData = new ImageData(cell.data, cell.width, cell.height);
      ctx.putImageData(imageData, i * first.width, 0);
    }
    const png = await handle.toBlob();
    return {
      png,
      manifest: {
        frameWidth: first.width,
        frameHeight: first.height,
        frameCount: frames.length,
        durations: frames.map((f) => f.duration),
      },
    };
  } finally {
    handle.cleanup();
  }
}
