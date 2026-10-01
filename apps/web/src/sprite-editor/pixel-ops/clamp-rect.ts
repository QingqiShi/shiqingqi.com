import type { Rect } from "./types";

/** Clamp `rect` to a `w` × `h` bound and return the clipped result. */
export function clampRect(rect: Rect, w: number, h: number): Rect {
  const x0 = Math.max(0, rect.x);
  const y0 = Math.max(0, rect.y);
  const x1 = Math.min(w, rect.x + rect.w);
  const y1 = Math.min(h, rect.y + rect.h);
  return { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) };
}
