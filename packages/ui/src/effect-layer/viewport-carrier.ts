import { bandGeometry, fixedBottomTop } from "./compute-bands.ts";
import type { CarrierClock } from "./create-element-tracker.ts";
import type {
  CanvasKit,
  Carrier,
  CarrierCanvases,
  CarrierSurface,
} from "./types.ts";

/**
 * The `<canvas>` element of the viewport, which covers the viewport. `topOf`
 * gives the page y of its top edge from the clock and its height.
 */
function createViewportCanvases<Surface extends CarrierSurface>(
  canvases: readonly HTMLCanvasElement[],
  kit: CanvasKit<Surface>,
  topOf: (clock: CarrierClock, height: number) => number,
): CarrierCanvases<Surface> {
  const canvas = canvases.at(0);
  const surface = canvas === undefined ? null : kit.configure(canvas);
  let sized: {
    readonly width: number;
    readonly height: number;
    readonly pixelRatio: number;
  } | null = null;

  return {
    canvases,
    size({ document: { width }, viewportHeight, pixelRatio }) {
      const height = bandGeometry(viewportHeight).viewport;
      if (
        surface === null ||
        (sized?.width === width &&
          sized.height === height &&
          sized.pixelRatio === pixelRatio)
      ) {
        return;
      }
      sized = { width, height, pixelRatio };
      kit.size(surface.canvas, width, height);
    },
    passes({ clock, document, viewportHeight }, carrier, range) {
      if (surface === null) {
        return [];
      }
      const height = bandGeometry(viewportHeight).viewport;
      const y = topOf(clock, height);
      return [
        {
          surface,
          scissor: {
            x: 0,
            y: 0,
            width: surface.canvas.width,
            height: surface.canvas.height,
          },
          target: {
            carrier,
            band: null,
            x: clock.scrollX,
            y,
            width: document.width,
            height,
            drawnPageRange: [y, y + height],
            firstElement: range.firstElement,
            elementCount: range.elementCount,
            bindGroup: surface.bindGroup,
          },
        },
      ];
    },
    release() {
      if (surface !== null) {
        kit.release(surface);
      }
    },
  };
}

const viewportCarriers = {
  /** The viewport from its top edge: its local coordinates are viewport coordinates. */
  fixed: {
    key: "fixed",
    toLocal: (box) => box,
    toPage: (local, { scrollX, scrollY }) => ({
      ...local,
      x: local.x + scrollX,
      y: local.y + scrollY,
    }),
    watchRoot: () => null,
    need: () => ({ key: "fixed", content: null }),
    createCanvases: (canvases, kit) =>
      createViewportCanvases(canvases, kit, ({ scrollY }) => scrollY),
  },
  /**
   * The viewport from its bottom edge, which a mobile toolbar moves: its
   * local y is the distance from that edge.
   */
  fixedBottom: {
    key: "fixedBottom",
    toLocal: (box, context) => ({
      ...box,
      y: box.y - context.viewportBottom(),
    }),
    toPage: (local, clock) => ({
      ...local,
      x: local.x + clock.scrollX,
      y: local.y + clock.scrollY + clock.viewportBottom(),
    }),
    watchRoot: () => null,
    need: () => ({ key: "fixedBottom", content: null }),
    createCanvases: (canvases, kit) =>
      createViewportCanvases(canvases, kit, (clock, height) =>
        fixedBottomTop(clock.scrollY, clock.viewportBottom(), height),
      ),
  },
} satisfies Record<string, Carrier>;

/**
 * The viewport carrier from its top or its bottom edge: one `<canvas>`
 * element fixed to the viewport, over every other plane.
 *
 * @internal
 */
export function viewportCarrier(key: "fixed" | "fixedBottom"): Carrier {
  return viewportCarriers[key];
}
