import type { CellPixels } from "../../types";

/** Clone a CellPixels into a new buffer so callers can mutate freely. */
export function cloneCell(cell: CellPixels): CellPixels {
  return {
    width: cell.width,
    height: cell.height,
    data: new Uint8ClampedArray(cell.data),
  };
}
