/**
 * Ceiling for the `radius` prop. The radius is set per element, within this
 * cap — a large radius is expensive to composite, and the cost repeats across
 * every stacked layer below.
 */
const RADIUS_CAP_PX = 32;

/**
 * One masked blur cannot ease: a mask fades the blurred pane's opacity, so
 * mid-ramp the sharp page shows through a half-transparent blur — a double
 * image rather than a lighter blur. Stacked layers ease properly: each layer
 * blurs at double the radius of the one before, and its mask turns opaque one
 * band further along the ramp, so the layers compound towards the full radius
 * against the element and drop away band by band towards the sharp edge.
 *
 * @internal
 */
export const LAYER_COUNT = 5;

/**
 * Each layer's `backdrop-filter` and its place along the ramp, weakest first —
 * the arithmetic every stack shares, whichever shape its masks take.
 *
 * @internal
 */
export function blurLayerSteps(radius: number, isShown: boolean) {
  const cappedRadius = Math.min(Math.max(radius, 0), RADIUS_CAP_PX);
  return Array.from({ length: LAYER_COUNT }, (_, index) => {
    const layerRadius = isShown
      ? cappedRadius / 2 ** (LAYER_COUNT - 1 - index)
      : 0;
    return {
      filter: `blur(${String(layerRadius)}px)`,
      // `holdBands`: where this layer stops being fully opaque, in bands
      // along the reach — a gradient mask holds solid to there, and a rect
      // mask centres its ramp on it, half opaque. `goneBands`: where the
      // layer has dropped out entirely. Each layer sits one band further out
      // than the one before it.
      holdBands: LAYER_COUNT - 1 - index,
      goneBands: LAYER_COUNT - index,
    };
  });
}
