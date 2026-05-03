/**
 * Pure helpers for computing sub-cell guide positions. Returns fractional
 * offsets in `[0, 1]` along an axis — callers convert to source-pixel or
 * canvas-pixel space.
 */

export interface GuideOptions {
  halves: boolean;
  thirds: boolean;
  baseline: boolean;
}

export const DEFAULT_GUIDES: GuideOptions = {
  halves: false,
  thirds: false,
  baseline: false,
};

/**
 * Vertical lines (offsets along x) and horizontal lines (offsets along y).
 * Returned as separate arrays so callers can draw them independently.
 */
export function computeGuideFractions(options: GuideOptions): {
  vertical: readonly number[];
  horizontal: readonly number[];
} {
  const v: number[] = [];
  const h: number[] = [];
  if (options.halves) {
    v.push(0.5);
    h.push(0.5);
  }
  if (options.thirds) {
    v.push(1 / 3, 2 / 3);
    h.push(1 / 3, 2 / 3);
  }
  if (options.baseline) {
    // Baseline is conventionally a horizontal line near the bottom of the cell;
    // 0.85 keeps a foot/floor reference for sprites without dictating an exact
    // pixel row across all output sizes.
    h.push(0.85);
  }
  return { vertical: v, horizontal: h };
}
