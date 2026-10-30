import {
  bandGeometry,
  bandScissorRect,
  computeBands,
} from "./compute-bands.ts";
import type {
  CanvasKit,
  Carrier,
  CarrierCanvases,
  CarrierFrame,
  CarrierPass,
  CarrierSurface,
} from "./types.ts";

/** Where the content box of a banded carrier is in one frame. */
interface BandedPlace {
  /** The page position of its top-left corner. */
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  /** The top of the scrollport, in the coordinates of the content box. */
  readonly scrollTop: number;
  /** The height of the scrollport. */
  readonly viewportHeight: number;
}

interface Slot<Surface> {
  readonly surface: Surface;
  /** The band the `<canvas>` element sits on, kept while it is out of range. */
  bandIndex: number | null;
}

/**
 * The two scroll `<canvas>` elements of a scrolled box, which take turns to
 * cover the bands of its content box that `computeBands` gives. A band
 * outside the viewport and its overscan margin has no pass: it keeps its
 * last pixels, which no one sees, until it comes near again.
 */
function createBandedCanvases<Surface extends CarrierSurface>(
  canvases: readonly HTMLCanvasElement[],
  kit: CanvasKit<Surface>,
  placeOf: (frame: CarrierFrame) => BandedPlace | null,
): CarrierCanvases<Surface> {
  const slots = canvases.flatMap((canvas): Slot<Surface>[] => {
    const surface = kit.configure(canvas);
    return surface === null ? [] : [{ surface, bandIndex: null }];
  });
  let sized: {
    readonly width: number;
    readonly bandHeight: number;
    readonly pixelRatio: number;
  } | null = null;

  return {
    canvases,
    size(frame) {
      const place = placeOf(frame);
      if (place === null) {
        return;
      }
      const { width } = place;
      const { bandHeight } = bandGeometry(place.viewportHeight);
      const { pixelRatio } = frame;
      if (
        sized?.width === width &&
        sized.bandHeight === bandHeight &&
        sized.pixelRatio === pixelRatio
      ) {
        return;
      }
      sized = { width, bandHeight, pixelRatio };
      for (const slot of slots) {
        kit.size(slot.surface.canvas, width, bandHeight);
        slot.bandIndex = null;
      }
    },
    passes(frame, carrier, { firstElement, elementCount }) {
      const place = placeOf(frame);
      if (place === null || slots.length !== 2) {
        return [];
      }
      const { bandHeight } = bandGeometry(place.viewportHeight);
      const { viewport, margin } = bandGeometry(frame.viewportHeight);
      const { scrollY } = frame.clock;
      return computeBands({
        scrollTop: place.scrollTop,
        viewportHeight: place.viewportHeight,
        documentHeight: place.height,
      })
        .map((band): CarrierPass<Surface> => {
          const slot = slots[band.slot];
          const { surface } = slot;
          const { canvas } = surface;
          if (slot.bandIndex !== band.index) {
            slot.bandIndex = band.index;
            canvas.style.transform = `translateY(${String(band.top)}px)`;
          }
          const y = place.top + band.top;
          return {
            surface,
            scissor: bandScissorRect(
              band,
              canvas.width,
              canvas.height,
              bandHeight,
            ),
            target: {
              carrier,
              band,
              x: place.left,
              y,
              width: place.width,
              height: bandHeight,
              drawnPageRange: [
                y + band.drawnTop,
                y + band.drawnTop + band.drawnHeight,
              ],
              firstElement,
              elementCount,
            },
          };
        })
        .filter(
          ({ target: { drawnPageRange } }) =>
            drawnPageRange[1] > scrollY - margin &&
            drawnPageRange[0] < scrollY + viewport + margin,
        );
    },
    release() {
      for (const { surface } of slots) {
        kit.release(surface);
      }
    },
  };
}

/**
 * The page, the root Scroll region: its local coordinates are page
 * coordinates, and its bands cover the document.
 */
const pageCarrier: Carrier = {
  key: "page",
  toLocal: (box, { scrollX, scrollY }) => ({
    ...box,
    x: box.x + scrollX,
    y: box.y + scrollY,
  }),
  toPage: (local) => local,
  watchRoot: (element) => element.ownerDocument.documentElement,
  need: (modalCovers) =>
    modalCovers.length === 0 ? { key: "page", content: null } : null,
  createCanvases: (canvases, kit) =>
    createBandedCanvases(
      canvases,
      kit,
      ({ clock, document, viewportHeight }) => ({
        ...document,
        scrollTop: clock.scrollY - document.top,
        viewportHeight,
      }),
    ),
};

/**
 * The Scroll region `id`: its local coordinates are those of its content
 * box, without the scale of a transform around it, and its bands cover that
 * box.
 */
function scrollRegionCarrier(id: number): Carrier {
  return {
    key: id,
    toLocal(box, context) {
      const frame = context.contentFrame(id);
      if (frame === null) {
        return null;
      }
      const { left, top, scale } = frame;
      return {
        ...box,
        x: (box.x - left) / scale,
        y: (box.y - top) / scale,
        width: box.width / scale,
        height: box.height / scale,
        radii: [
          box.radii[0] / scale,
          box.radii[1] / scale,
          box.radii[2] / scale,
          box.radii[3] / scale,
        ],
      };
    },
    toPage(local, clock) {
      const origin = clock.regionOrigin(id);
      return origin === null
        ? null
        : { ...local, x: local.x + origin.x, y: local.y + origin.y };
    },
    watchRoot(element, context) {
      const page = element.ownerDocument.documentElement;
      const region = context.region(id);
      if (region === undefined) {
        return page;
      }
      // An observer reads a root only when the element is inside it.
      return region.content.contains(element)
        ? region.content
        : region.scroller.contains(element)
          ? region.scroller
          : page;
    },
    need(modalCovers, lookup) {
      const region = lookup(id);
      const shows =
        region !== undefined &&
        (modalCovers.length === 0 ||
          modalCovers.some((cover) => cover.contains(region.scroller)));
      return shows ? { key: id, content: region.content } : null;
    },
    createCanvases: (canvases, kit) =>
      createBandedCanvases(canvases, kit, ({ clock }) => {
        const place = clock.regionPlace(id);
        return (
          place && {
            left: place.origin.x,
            top: place.origin.y,
            width: Math.max(1, Math.round(place.width)),
            height: place.height,
            scrollTop: place.scrollTop,
            viewportHeight: place.viewportHeight,
          }
        );
      }),
  };
}

/**
 * The banded carrier of the page or of a Scroll region: two scroll
 * `<canvas>` elements in its content box, which scroll with it.
 *
 * @internal
 */
export function bandedCarrier(key: "page" | number): Carrier {
  return key === "page" ? pageCarrier : scrollRegionCarrier(key);
}
