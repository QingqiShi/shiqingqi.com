import type { CellPixels } from "../../types";
import { clampRect } from "./clamp-rect";
import type { Rect } from "./types";

/** Erase pixels inside `rect` (clamped to bounds) by writing transparent. */
export function eraseRect(cell: CellPixels, rect: Rect): void {
  const c = clampRect(rect, cell.width, cell.height);
  for (let y = c.y; y < c.y + c.h; y++) {
    for (let x = c.x; x < c.x + c.w; x++) {
      const i = (y * cell.width + x) * 4;
      cell.data[i] = 0;
      cell.data[i + 1] = 0;
      cell.data[i + 2] = 0;
      cell.data[i + 3] = 0;
    }
  }
}
