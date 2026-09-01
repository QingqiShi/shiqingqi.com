import { blurLayerSteps, LAYER_COUNT } from "./blur-layer-steps.ts";

/**
 * The blur's own box and the floating element's rect within it, in px,
 * measured relative to the box's top-left corner.
 *
 * @internal
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

// A Gaussian blur of a hard edge runs from about 95% to about 5% over 1.65
// standard deviations either side of it, so a band's worth of ramp is a
// standard deviation of a band over 3.3.
const RAMP_DEVIATIONS = 3.3;

/** At most two decimals, so a subpixel jitter never rewrites a mask. */
function svgNumber(value: number) {
  return String(Math.round(value * 100) / 100);
}

/**
 * The ramp around the element: how much page each side has, divided over the
 * layers — one band is one layer's step along that side's ramp — and the mean
 * band on each axis, which the corners and the edge softening share. A side
 * with nothing beyond the element has no band, so the mask stops flush with
 * that edge.
 */
function rampAround(geometry: BlurGeometry) {
  const bands = {
    left: Math.max(geometry.left, 0) / LAYER_COUNT,
    top: Math.max(geometry.top, 0) / LAYER_COUNT,
    right: Math.max(geometry.width - geometry.right, 0) / LAYER_COUNT,
    bottom: Math.max(geometry.height - geometry.bottom, 0) / LAYER_COUNT,
  };
  return {
    geometry,
    bands,
    meanX: (bands.left + bands.right) / 2,
    meanY: (bands.top + bands.bottom) / 2,
  };
}

type BlurRamp = ReturnType<typeof rampAround>;

/**
 * One layer's mask, as an SVG image the size of the box: the element's rect
 * grown by `spread` bands on every side, its corners rounded by the same
 * amount, and the whole shape Gaussian-blurred by a third of a band so its
 * edge ramps out over the band it ends on. The rect's alpha is the mask.
 *
 * An image rather than a gradient because a gradient ramps along one axis
 * only: two of them multiplied round the fade at the corners but leave the
 * opaque plateau inside a sharp-cornered rectangle, so the blur field reads
 * as a box at every level. A blurred rounded rect is round the whole way out.
 *
 * The filter region is the box rather than the rect, so the ramp is never
 * clipped to the shape it came from.
 */
function layerMask(
  { geometry, bands, meanX, meanY }: BlurRamp,
  spread: number,
) {
  const left = geometry.left - spread * bands.left;
  const top = geometry.top - spread * bands.top;
  const box = `width='${svgNumber(geometry.width)}' height='${svgNumber(geometry.height)}'`;
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' ${box}>` +
    `<filter id='ramp' filterUnits='userSpaceOnUse' x='0' y='0' ${box}>` +
    `<feGaussianBlur stdDeviation='${svgNumber(meanX / RAMP_DEVIATIONS)} ${svgNumber(meanY / RAMP_DEVIATIONS)}'/>` +
    `</filter>` +
    `<rect x='${svgNumber(left)}' y='${svgNumber(top)}'` +
    ` width='${svgNumber(geometry.right + spread * bands.right - left)}'` +
    ` height='${svgNumber(geometry.bottom + spread * bands.bottom - top)}'` +
    ` rx='${svgNumber(spread * meanX)}' ry='${svgNumber(spread * meanY)}'` +
    ` filter='url(#ramp)'/></svg>`;

  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/**
 * The stack of blurred layers, weakest first, as the `backdrop-filter` and
 * `mask-image` each one carries. Every layer's mask is a blurred rounded rect
 * around the floating element's own rect, half a band past where that layer
 * holds opaque — so the blur radiates out of the element on every side and
 * stays round at every level.
 *
 * Unmeasured, every layer masks to `none` — a uniform blur across the whole
 * box, which is what the server renders and what the first paint shows.
 *
 * @internal
 */
export function buildBlurLayers({
  geometry,
  radius,
  isShown,
}: BlurLayerOptions) {
  const ramp = geometry === null ? null : rampAround(geometry);
  return blurLayerSteps(radius, isShown).map(({ filter, holdBands }) => ({
    filter,
    // Half a band past the hold line puts the ramp's midpoint there, so the
    // layer is ~95% opaque where it holds and ~5% where it is gone.
    mask: ramp === null ? "none" : layerMask(ramp, holdBands + 0.5),
  }));
}
