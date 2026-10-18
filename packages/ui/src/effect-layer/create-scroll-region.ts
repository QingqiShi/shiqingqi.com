import type { RegisteredRegion } from "./create-effect-registry.ts";
import {
  createElementTracker,
  type CarrierClock,
  type ElementTracker,
  type MeasureContext,
} from "./create-element-tracker.ts";

/**
 * Where the content box of a Scroll region is in one frame. Lengths are CSS
 * px.
 *
 * @internal
 */
export interface RegionPlace {
  /** The page position of the content box's top-left corner. */
  readonly origin: { readonly x: number; readonly y: number };
  /**
   * The top of the scrollport in the coordinates of the content box, as
   * `computeBands` takes `scrollTop`.
   */
  readonly scrollTop: number;
  /** The height of the scrollport. */
  readonly viewportHeight: number;
  /** The size of the content box, without the scale of a transform. */
  readonly width: number;
  readonly height: number;
}

/** What a measurement of the region reads, except the scroll now. */
interface RegionGeometry {
  /** The content box in the scroll coordinates of the scroller. */
  readonly contentX: number;
  readonly contentY: number;
  /** The scroller's border at the start of each axis. */
  readonly borderLeft: number;
  readonly borderTop: number;
  readonly clientHeight: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Tracks one Scroll region: the scroller's box on the region's parent
 * carrier, and where the content box is in the scroller. It reads the
 * scroll only when a frame asks for the region's place, so a scroll of the
 * region measures nothing. The elements on the region keep their place in
 * the content box, so the compositor moves their effects with the scroll.
 *
 * - `queue` queues the region to measure before the next frame, after a
 *   signal of its scroller's tracker, or after a size of the scroller, of
 *   the content box or of another child of the scroller changes.
 * - `onScroll` asks for a frame after each scroll of the scroller.
 * - `onResize` tells that the size of the content box changed, so that the
 *   move watches of the elements in it are wrong.
 *
 * @internal
 */
export function createScrollRegion(
  { id, scroller, content, parent }: RegisteredRegion,
  {
    queue,
    onScroll,
    onResize,
  }: {
    queue: (region: ScrollRegionWatch) => void;
    onScroll: () => void;
    onResize: () => void;
  },
) {
  let geometry: RegionGeometry | null = null;
  let ready = false;
  let destroyed = false;
  // A new tracker signals at once, before the watch below exists. Thus, the
  // watch queues itself when it is ready.
  const tracker: ElementTracker = createElementTracker(
    scroller,
    () => {
      if (ready) {
        queue(watch);
      }
    },
    parent,
  );
  const resizeObserver = new ResizeObserver(() => {
    queue(watch);
    onScroll();
  });
  resizeObserver.observe(scroller);
  resizeObserver.observe(content, { box: "border-box" });
  for (const child of scroller.children) {
    if (child !== content) {
      resizeObserver.observe(child, { box: "border-box" });
    }
  }
  scroller.addEventListener("scroll", onScroll, { passive: true });

  const watch = {
    id,
    scroller,
    content,
    tracker,
    /** Measures the scroller and the content box. */
    measure(context: MeasureContext) {
      if (destroyed) {
        return;
      }
      tracker.measure(context);
      const frame = context.contentFrame(id);
      if (!scroller.isConnected || frame === null) {
        geometry = null;
        return;
      }
      const scrollerRect = context.rectOf(scroller);
      const next: RegionGeometry = {
        contentX:
          frame.left -
          scrollerRect.left -
          scroller.clientLeft +
          scroller.scrollLeft,
        contentY:
          frame.top -
          scrollerRect.top -
          scroller.clientTop +
          scroller.scrollTop,
        borderLeft: scroller.clientLeft,
        borderTop: scroller.clientTop,
        clientHeight: scroller.clientHeight,
        width: frame.width,
        height: frame.height,
      };
      const resized =
        geometry !== null &&
        (geometry.width !== next.width || geometry.height !== next.height);
      geometry = next;
      if (resized) {
        onResize();
      }
    },
    /**
     * Where the content box is at the time of `clock`, from the scroller's
     * last measured box and the scroll now, or `null` while it is not
     * measured.
     */
    place(clock: CarrierClock): RegionPlace | null {
      const box = tracker.boxAt(clock);
      if (geometry === null || box === null) {
        return null;
      }
      const { scrollLeft, scrollTop } = scroller;
      return {
        origin: {
          x: box.x + geometry.borderLeft + geometry.contentX - scrollLeft,
          y: box.y + geometry.borderTop + geometry.contentY - scrollTop,
        },
        scrollTop: scrollTop - geometry.contentY,
        viewportHeight: geometry.clientHeight,
        width: geometry.width,
        height: geometry.height,
      };
    },
    destroy() {
      destroyed = true;
      tracker.destroy();
      resizeObserver.disconnect();
      scroller.removeEventListener("scroll", onScroll);
    },
  };
  ready = true;
  queue(watch);
  return watch;
}

/** @internal */
export type ScrollRegionWatch = ReturnType<typeof createScrollRegion>;
