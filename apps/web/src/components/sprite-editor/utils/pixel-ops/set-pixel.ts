import type { CellPixels } from "../../types";

/** Set RGBA at `(x, y)` (in place). Out-of-bounds writes are ignored. */
export function setPixel(
  cell: CellPixels,
  x: number,
  y: number,
  rgba: readonly [number, number, number, number],
): void {
  if (x < 0 || y < 0 || x >= cell.width || y >= cell.height) return;
  const i = (y * cell.width + x) * 4;
  cell.data[i] = rgba[0];
  cell.data[i + 1] = rgba[1];
  cell.data[i + 2] = rgba[2];
  cell.data[i + 3] = rgba[3];
}
