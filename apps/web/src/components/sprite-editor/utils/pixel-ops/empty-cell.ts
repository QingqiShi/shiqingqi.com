import type { CellPixels } from "../../types";

/** Allocate an empty (fully transparent) CellPixels of the given size. */
export function emptyCell(width: number, height: number): CellPixels {
  return {
    width,
    height,
    data: new Uint8ClampedArray(new ArrayBuffer(width * height * 4)),
  };
}
