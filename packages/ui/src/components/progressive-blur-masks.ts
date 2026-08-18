/**
 * Ceiling for the `radius` prop. The radius is set per element, within this
 * cap — a large radius is expensive to composite, and the cost repeats across
 * every stacked layer below.
 */
export const RADIUS_CAP_PX = 32;

// One masked blur cannot ease: a mask fades the blurred pane's opacity, so
// mid-ramp the sharp page shows through a half-transparent blur — a double
// image rather than a lighter blur. Stacked layers ease properly: each layer
// blurs at double the radius of the one before, and its mask turns opaque one
// band further along the ramp, so the layers compound towards the full radius
// against the element and drop away band by band towards the sharp edge.
export const LAYER_COUNT = 5;

/**
 * The blur's own box and the floating element's rect within it, in px,
 * measured relative to the box's top-left corner.
 */
export interface BlurGeometry {
  width: number;
  height: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface BlurLayerOptions {
  /** `null` until the first layout — nothing is measured server-side. */
  geometry: BlurGeometry | null;
  radius: number;
  isShown: boolean;
}

interface RampAxis {
  direction: string;
  near: number;
  far: number;
  nearReach: number;
  farReach: number;
}

// #000 vs. transparent are the mask's opaque/cut keywords — the colour value
// is irrelevant.
function ramp(
  { direction, near, far, nearReach, farReach }: RampAxis,
  holdBands: number,
  goneBands: number,
) {
  // Multiplied before dividing, so a whole number of bands out of a whole
  // number of pixels never lands on a floating-point tail.
  const before = (bands: number) =>
    `${String(near - (nearReach * bands) / LAYER_COUNT)}px`;
  const after = (bands: number) =>
    `${String(far + (farReach * bands) / LAYER_COUNT)}px`;
  return `linear-gradient(${direction}, transparent ${before(goneBands)}, #000 ${before(holdBands)}, #000 ${after(holdBands)}, transparent ${after(goneBands)})`;
}

/**
 * Each layer's `backdrop-filter` and its place along the ramp, weakest first —
 * the arithmetic every stack shares, whichever shape its masks take.
 */
function blurLayerSteps(radius: number, isShown: boolean) {
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

/**
 * The stack of blurred layers, weakest first, as the `backdrop-filter` and
 * `mask-image` each one carries. Every layer holds a mask per axis, composited
 * with `intersect`: multiplying the two ramps rounds the corners, so the blur
 * radiates out of the floating element's rect rather than out of its edges.
 *
 * Unmeasured, every layer masks to `none` — a uniform blur across the whole
 * box, which is what the server renders and what the first paint shows.
 */
export function buildBlurLayers({
  geometry,
  radius,
  isShown,
}: BlurLayerOptions) {
  const axes = geometry && [
    {
      direction: "to right",
      near: geometry.left,
      far: geometry.right,
      nearReach: Math.max(geometry.left, 0),
      farReach: Math.max(geometry.width - geometry.right, 0),
    },
    {
      direction: "to bottom",
      near: geometry.top,
      far: geometry.bottom,
      nearReach: Math.max(geometry.top, 0),
      farReach: Math.max(geometry.height - geometry.bottom, 0),
    },
  ];

  return blurLayerSteps(radius, isShown).map(
    ({ filter, holdBands, goneBands }) => ({
      filter,
      mask: axes
        ? axes.map((axis) => ramp(axis, holdBands, goneBands)).join(", ")
        : "none",
    }),
  );
}

interface EdgeBlurLayerOptions {
  /**
   * The ramp's direction as a `linear-gradient` direction, pointing from the
   * region's edge inward — so the strongest layer sits against the edge.
   */
  direction: string;
  radius: number;
  isShown: boolean;
}

// Multiplied before dividing, the same way `ramp` does, so a whole number of
// bands never lands on a floating-point tail.
function bandStop(bands: number) {
  return `${String((bands * 100) / LAYER_COUNT)}%`;
}

/**
 * The stack of blurred layers for one edge of a scroll region, weakest first.
 * The ramp runs along a single axis rather than radiating from a measured
 * rect, so each layer carries one mask instead of two and nothing needs
 * compositing.
 *
 * The stops are percentages because the caller sizes the band to exactly how
 * far the blur reaches: the ramp is always the full depth of the element it
 * masks, whatever CSS length that works out to.
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
