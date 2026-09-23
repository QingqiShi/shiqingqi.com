import { VIEWPORT_SLOP_PX } from "./constants.ts";
import type { ProbedViewports } from "./resolve-probes.ts";

/**
 * - `url-bar`: a mobile URL bar moved. The band is as tall as the large
 *   viewport, so it has nothing to do.
 * - `height`: a real height change at the same width.
 * - `width`: the width changed, so the band has to be allocated again.
 */
export type ResizeKind = "url-bar" | "height" | "width";

/**
 * What a viewport event means for the band. It reads no layout: iOS Safari
 * fires `resize` for every step of the URL bar animation, so the test is the
 * probed range from the last real measurement.
 */
export function classifyResize(
  reading: { width: number; innerHeight: number },
  previousWidth: number,
  probed: ProbedViewports,
): ResizeKind {
  if (reading.width !== previousWidth) return "width";
  if (
    reading.innerHeight >= probed.small - VIEWPORT_SLOP_PX &&
    reading.innerHeight <= probed.large + VIEWPORT_SLOP_PX
  ) {
    return "url-bar";
  }
  return "height";
}
