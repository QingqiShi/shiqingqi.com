import type { CellPixels } from "../../types";

/** Flip a CellPixels vertically (in place). */
export function flipCellV(cell: CellPixels): void {
  const half = Math.floor(cell.height / 2);
  for (let y = 0; y < half; y++) {
    for (let x = 0; x < cell.width; x++) {
      const ti = (y * cell.width + x) * 4;
      const bi = ((cell.height - 1 - y) * cell.width + x) * 4;
      for (let k = 0; k < 4; k++) {
        const tmp = cell.data[ti + k];
        cell.data[ti + k] = cell.data[bi + k];
        cell.data[bi + k] = tmp;
      }
    }
  }
}
