import { blurLayerSteps, LAYER_COUNT } from "./blur-layer-steps.ts";

interface EdgeBlurLayerOptions {
  /**
   * The ramp's direction as a `linear-gradient` direction, pointing from the
   * region's edge inward — so the strongest layer sits against the edge.
   */
  direction: string;
  radius: number;
  isShown: boolean;
}

// Multiplied before dividing, so a whole number of bands never lands on a
// floating-point tail.
function bandStop(bands: number) {
  return `${String((bands * 100) / LAYER_COUNT)}%`;
}

/**
 * The stack of blurred layers for one edge of a scroll region, weakest first.
 * The stops are percentages, because the caller sizes the band to exactly how
 * far the blur reaches.
 *
 * @internal
 */
export function buildEdgeBlurLayers({
  direction,
  radius,
  isShown,
}: EdgeBlurLayerOptions) {
  return blurLayerSteps(radius, isShown).map(
    ({ filter, holdBands, goneBands }) => ({
      filter,
      mask: `linear-gradient(${direction}, #000 ${bandStop(holdBands)}, transparent ${bandStop(goneBands)})`,
    }),
  );
}
