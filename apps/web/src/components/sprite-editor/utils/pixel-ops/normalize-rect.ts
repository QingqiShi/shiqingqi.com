import type { Rect } from "./types";

/** Normalize a possibly-inverted rect to positive width/height. */
export function normalizeRect(rect: Rect): Rect {
  const x = rect.w < 0 ? rect.x + rect.w : rect.x;
  const y = rect.h < 0 ? rect.y + rect.h : rect.y;
  return { x, y, w: Math.abs(rect.w), h: Math.abs(rect.h) };
}
