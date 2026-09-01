/**
 * Ceiling for the `radius` prop. The radius is set per element, within this
 * cap — a large radius is expensive to composite, and the cost repeats across
 * every stacked layer below.
 */
const RADIUS_CAP_PX = 32;

// One masked blur cannot ease: a mask fades the blurred pane's opacity, so
// mid-ramp the sharp page shows through a half-transparent blur — a double
// image rather than a lighter blur. Stacked layers ease properly: each layer
// blurs at double the radius of the one before, and its mask turns opaque one
// band further along the ramp, so the layers compound towards the full radius
// against the element and drop away band by band towards the sharp edge.
export const LAYER_COUNT = 5;

/**
 * Each layer's `backdrop-filter` and its place along the ramp, weakest first —
 * the arithmetic every stack shares, whichever shape its masks take.
 */
export function blurLayerSteps(radius: number, isShown: boolean) {
  const cappedRadius = Math.min(Math.max(radius, 0), RADIUS_CAP_PX);
  return Array.from({ length: LAYER_COUNT }, (_, index) => {
    const layerRadius = isShown
      ? cappedRadius / 2 ** (LAYER_COUNT - 1 - index)
      : 0;
    return {
      filter: `blur(${String(layerRadius)}px)`,
      // `holdBands`: how far along the reach, in bands, this layer is already
      // fully opaque. `goneBands`: where it has dropped out entirely. Each
      // layer holds one band further out than the one before it.
      holdBands: LAYER_COUNT - 1 - index,
      goneBands: LAYER_COUNT - index,
    };
  });
}
