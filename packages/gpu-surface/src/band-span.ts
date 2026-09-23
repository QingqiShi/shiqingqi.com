import {
  AHEAD_SHARE,
  BAND_BUDGET_MPX,
  BAND_MAX_SPAN,
  BAND_SPAN_STEP,
  GUARD_FLOOR_CSS_PX,
  MOVE_GAIN,
} from "./constants.ts";
import { snapToDevicePx } from "./snap-to-device-px.ts";

export interface BandSpanInput {
  /** The layout viewport width, in CSS px. */
  viewportWidth: number;
  /** The large viewport height (`100lvh`), in CSS px. */
  largeViewport: number;
  /** Device px per CSS px that the band is drawn at. */
  scale: number;
  budgetMpx?: number;
}

/**
 * How many large viewports tall the band is. The span spends a pixel budget,
 * with a floor: a move has to leave at least `MOVE_GAIN` guards of room ahead
 * of the scroll, or the next move follows at once.
 */
export function bandSpan({
  viewportWidth,
  largeViewport,
  scale,
  budgetMpx = BAND_BUDGET_MPX,
}: BandSpanInput) {
  const large = Math.max(1, largeViewport);
  const perViewport = Math.max(1, viewportWidth * scale * (large * scale));
  const fromBudget = (budgetMpx * 1e6) / perViewport;
  const floor = 1 + (GUARD_FLOOR_CSS_PX * MOVE_GAIN) / AHEAD_SHARE / large;
  const span =
    Math.round(Math.max(fromBudget, floor) / BAND_SPAN_STEP) * BAND_SPAN_STEP;
  return Math.min(span, BAND_MAX_SPAN);
}

/**
 * The band's height in CSS px. The band never makes the document taller, so
 * it shrinks to the document where the document is shorter than the span.
 */
export function bandHeight(
  largeViewport: number,
  span: number,
  scale: number,
  docHeight: number,
) {
  return Math.max(
    1,
    Math.min(snapToDevicePx(largeViewport * span, scale), docHeight),
  );
}
