import type { CellPixels } from "../../types";

/** Flip a CellPixels horizontally (in place). */
export function flipCellH(cell: CellPixels): void {
  const half = Math.floor(cell.width / 2);
  for (let y = 0; y < cell.height; y++) {
    for (let x = 0; x < half; x++) {
      const li = (y * cell.width + x) * 4;
      const ri = (y * cell.width + (cell.width - 1 - x)) * 4;
      for (let k = 0; k < 4; k++) {
        const tmp = cell.data[li + k];
        cell.data[li + k] = cell.data[ri + k];
        cell.data[ri + k] = tmp;
      }
    }
  }
}
