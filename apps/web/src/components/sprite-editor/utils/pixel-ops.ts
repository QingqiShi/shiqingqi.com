import type { CellPixels } from "../types";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Normalize a possibly-inverted rect to positive width/height. */
export function normalizeRect(rect: Rect): Rect {
  const x = rect.w < 0 ? rect.x + rect.w : rect.x;
  const y = rect.h < 0 ? rect.y + rect.h : rect.y;
  return { x, y, w: Math.abs(rect.w), h: Math.abs(rect.h) };
}

/** Clamp `rect` to the bounds of `cell` and return the clipped result. */
export function clampRect(rect: Rect, w: number, h: number): Rect {
  const x0 = Math.max(0, rect.x);
  const y0 = Math.max(0, rect.y);
  const x1 = Math.min(w, rect.x + rect.w);
  const y1 = Math.min(h, rect.y + rect.h);
  return { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) };
}

/** Allocate an empty (fully transparent) CellPixels of the given size. */
export function emptyCell(width: number, height: number): CellPixels {
  return {
    width,
    height,
    data: new Uint8ClampedArray(new ArrayBuffer(width * height * 4)),
  };
}

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

/** Parse a `#rrggbb` or `#rrggbbaa` string into 0-255 RGBA components. */
export function parseHex(
  hex: string,
): readonly [number, number, number, number] {
  const value = hex.startsWith("#") ? hex.slice(1) : hex;
  if (value.length === 6) {
    return [
      parseInt(value.slice(0, 2), 16),
      parseInt(value.slice(2, 4), 16),
      parseInt(value.slice(4, 6), 16),
      255,
    ];
  }
  if (value.length === 8) {
    return [
      parseInt(value.slice(0, 2), 16),
      parseInt(value.slice(2, 4), 16),
      parseInt(value.slice(4, 6), 16),
      parseInt(value.slice(6, 8), 16),
    ];
  }
  return [0, 0, 0, 255];
}

/** Format an RGBA tuple as `#rrggbb` (alpha ignored). */
export function rgbaToHex(r: number, g: number, b: number): string {
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

/** Clone a CellPixels into a new buffer so callers can mutate freely. */
export function cloneCell(cell: CellPixels): CellPixels {
  return {
    width: cell.width,
    height: cell.height,
    data: new Uint8ClampedArray(cell.data),
  };
}

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
