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

// How much a mask's edge softens, in bands. The value keeps each layer's ramp
// overlapping its neighbours', with no visible seam, while keeping the
// weakest layer's tail inside the box.
const MASK_DEVIATION_BANDS = 0.5;

/** At most two decimals, so a subpixel jitter never rewrites a mask. */
function svgNumber(value: number) {
  return String(Math.round(value * 100) / 100);
}

/**
 * The ramp around the element: how much page each side has, divided over the
 * layers, and the mean band on each axis. A side with nothing beyond the
 * element has no band, so the mask stops flush with that edge.
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
 * One layer's mask: the element's rect grown by `spread` bands, rounded, and
 * Gaussian-blurred by half a band to centre the ramp on its edge.
 *
 * An image, not a gradient, because multiplied gradients round the corners
 * but leave a sharp-cornered plateau, so the field reads as a box throughout.
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
    `<feGaussianBlur stdDeviation='${svgNumber(meanX * MASK_DEVIATION_BANDS)} ${svgNumber(meanY * MASK_DEVIATION_BANDS)}'/>` +
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
 * `mask-image` each one carries. Unmeasured, every layer masks to `none` — the
 * uniform blur across the whole box that the server renders.
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
    // Whole bands of spread: the strongest layer takes none, so its ramp
    // centres on the element's edge with no full blur held outside it.
    mask: ramp === null ? "none" : layerMask(ramp, holdBands),
  }));
}
