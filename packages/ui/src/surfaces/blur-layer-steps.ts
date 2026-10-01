/**
 * Ceiling for the `radius` prop. A large radius is expensive to composite, and
 * the cost repeats across every stacked layer below.
 */
const RADIUS_CAP_PX = 32;

/**
 * One masked blur cannot ease: fading its opacity lets the sharp page show
 * through mid-ramp as a double image. Stacked layers ease properly, each
 * blurring at double the radius of the one before.
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
      holdBands: LAYER_COUNT - 1 - index,
      goneBands: LAYER_COUNT - index,
    };
  });
}
