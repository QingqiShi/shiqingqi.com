import type { CellPixels } from "../../types";

/** Get RGBA at `(x, y)`. Returns `null` if out of bounds. */
export function getPixel(
  cell: CellPixels,
  x: number,
  y: number,
): readonly [number, number, number, number] | null {
  if (x < 0 || y < 0 || x >= cell.width || y >= cell.height) return null;
  const i = (y * cell.width + x) * 4;
  return [cell.data[i], cell.data[i + 1], cell.data[i + 2], cell.data[i + 3]];
}
