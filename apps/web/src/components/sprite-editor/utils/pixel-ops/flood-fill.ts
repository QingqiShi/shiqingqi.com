import type { CellPixels } from "../../types";
import { getPixel } from "./get-pixel";
import { setPixel } from "./set-pixel";

/**
 * 4-connected flood fill starting at `(x, y)`. Replaces every reachable pixel
 * whose color is within `tolerance` of the seed pixel with `replacement`.
 * Mutates `cell` in place.
 */
export function floodFill(
  cell: CellPixels,
  x: number,
  y: number,
  replacement: readonly [number, number, number, number],
  tolerance = 0,
): void {
  const seed = getPixel(cell, x, y);
  if (seed === null) return;
  const tolSq = tolerance * tolerance * 4; // distance² scaled to 4 components
  // Avoid infinite loops when the seed already matches the replacement.
  if (
    seed[0] === replacement[0] &&
    seed[1] === replacement[1] &&
    seed[2] === replacement[2] &&
    seed[3] === replacement[3]
  ) {
    return;
  }
  const stack: [number, number][] = [[x, y]];
  const visited = new Uint8Array(cell.width * cell.height);
  while (stack.length > 0) {
    const point = stack.pop();
    if (point === undefined) break;
    const [cx, cy] = point;
    if (cx < 0 || cy < 0 || cx >= cell.width || cy >= cell.height) continue;
    const flatIndex = cy * cell.width + cx;
    if (visited[flatIndex] === 1) continue;
    const current = getPixel(cell, cx, cy);
    if (current === null) continue;
    if (colorDistanceSquared(current, seed) > tolSq) continue;
    visited[flatIndex] = 1;
    setPixel(cell, cx, cy, replacement);
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
}

function colorDistanceSquared(
  a: readonly [number, number, number, number],
  b: readonly [number, number, number, number],
): number {
  // Plain RGBA distance — perceptual distance is overkill at 42×42.
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  const da = a[3] - b[3];
  return dr * dr + dg * dg + db * db + da * da;
}
