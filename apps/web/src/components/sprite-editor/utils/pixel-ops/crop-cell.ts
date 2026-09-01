import type { CellPixels } from "../../types";
import { emptyCell } from "./empty-cell";
import type { Rect } from "./types";

/** Crop `rect` from `cell` into a freshly-allocated CellPixels. */
export function cropCell(cell: CellPixels, rect: Rect): CellPixels {
  const out = emptyCell(rect.w, rect.h);
  for (let y = 0; y < rect.h; y++) {
    for (let x = 0; x < rect.w; x++) {
      const sx = rect.x + x;
      const sy = rect.y + y;
      if (sx < 0 || sy < 0 || sx >= cell.width || sy >= cell.height) continue;
      const si = (sy * cell.width + sx) * 4;
      const di = (y * rect.w + x) * 4;
      out.data[di] = cell.data[si];
      out.data[di + 1] = cell.data[si + 1];
      out.data[di + 2] = cell.data[si + 2];
      out.data[di + 3] = cell.data[si + 3];
    }
  }
  return out;
}
