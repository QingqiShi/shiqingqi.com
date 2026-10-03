/**
 * The share of the viewport height drawn past each edge of the viewport, so
 * that compositor scrolling does not show undrawn rows before the next frame.
 */
const OVERSCAN = 0.1;

/**
 * One band of the document that a scroll `<canvas>` element covers. Lengths
 * are CSS px; `top` is from the top of the document, the rest from the band's
 * top edge.
 *
 * @internal
 */
export interface Band {
  /** Band `index` covers `[index × bandHeight, (index + 1) × bandHeight)`. */
  readonly index: number;
  /** The scroll `<canvas>` element that holds the band: `index mod 2`. */
  readonly slot: 0 | 1;
  readonly top: number;
  /** The band's height, clipped at the end of the document. */
  readonly height: number;
  /** Where the part drawn this frame starts. */
  readonly drawnTop: number;
  readonly drawnHeight: number;
}

/**
 * A rectangle in the pixels of a `<canvas>` element's backing store, the shape
 * `GPURenderPassEncoder.setScissorRect` takes.
 *
 * @internal
 */
export interface ScissorRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * The size of a band for a viewport height: the viewport plus an overscan
 * margin on each side, in whole CSS px so that the two scroll `<canvas>`
 * elements meet without a seam.
 *
 * @internal
 */
export function bandGeometry(viewportHeight: number) {
  const viewport = Math.round(viewportHeight);
  const margin = Math.ceil(viewport * OVERSCAN);
  return { viewport, margin, bandHeight: viewport + 2 * margin };
}

/**
 * The bands that meet the viewport and its overscan margin, with the part of
 * each to draw this frame. A band is as tall as that range, so there are at
 * most two, and they use different slots.
 *
 * @internal
 */
export function computeBands({
  scrollTop,
  viewportHeight,
  documentHeight,
}: {
  /** Document y of the viewport's top edge. */
  scrollTop: number;
  viewportHeight: number;
  documentHeight: number;
}): Band[] {
  const { viewport, margin, bandHeight } = bandGeometry(viewportHeight);
  const start = Math.max(0, scrollTop - margin);
  const end = Math.min(documentHeight, scrollTop + viewport + margin);
  if (bandHeight <= 0 || end <= start) {
    return [];
  }

  const bands: Band[] = [];
  const last = Math.ceil(end / bandHeight) - 1;
  for (let index = Math.floor(start / bandHeight); index <= last; index++) {
    const top = index * bandHeight;
    const height = Math.min(bandHeight, documentHeight - top);
    const drawnTop = Math.max(start, top) - top;
    const drawnBottom = Math.min(end, top + height) - top;
    if (drawnBottom > drawnTop) {
      bands.push({
        index,
        slot: index % 2 === 0 ? 0 : 1,
        top,
        height,
        drawnTop,
        drawnHeight: drawnBottom - drawnTop,
      });
    }
  }
  return bands;
}

/**
 * The scissor rect for the part of a band drawn this frame. It takes whole
 * pixels that cover the drawn part, inside the backing store.
 *
 * @internal
 */
export function bandScissorRect(
  band: Band,
  backingWidth: number,
  backingHeight: number,
  bandHeight: number,
): ScissorRect {
  const scale = backingHeight / bandHeight;
  const top = Math.max(0, Math.floor(band.drawnTop * scale));
  const bottom = Math.min(
    backingHeight,
    Math.ceil((band.drawnTop + band.drawnHeight) * scale),
  );
  return {
    x: 0,
    y: top,
    width: backingWidth,
    height: Math.max(0, bottom - top),
  };
}
