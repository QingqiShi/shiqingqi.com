import type { CellPixels } from "../../types";

/**
 * Paste `source` (its full content) into `target` at (dx, dy), nearest-neighbor
 * scaled to (dw × dh). Fully-transparent source pixels are skipped so the
 * existing target pixel shows through.
 */
export function pasteCellScaled(
  target: CellPixels,
  source: CellPixels,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): void {
  if (dw <= 0 || dh <= 0) return;
  for (let y = 0; y < dh; y++) {
    const ty = dy + y;
    if (ty < 0 || ty >= target.height) continue;
    const sy = Math.min(
      source.height - 1,
      Math.floor((y / dh) * source.height),
    );
    for (let x = 0; x < dw; x++) {
      const tx = dx + x;
      if (tx < 0 || tx >= target.width) continue;
      const sx = Math.min(
        source.width - 1,
        Math.floor((x / dw) * source.width),
      );
      const si = (sy * source.width + sx) * 4;
      const a = source.data[si + 3];
      if (a === 0) continue;
      const ti = (ty * target.width + tx) * 4;
      target.data[ti] = source.data[si];
      target.data[ti + 1] = source.data[si + 1];
      target.data[ti + 2] = source.data[si + 2];
      target.data[ti + 3] = a;
    }
  }
}
