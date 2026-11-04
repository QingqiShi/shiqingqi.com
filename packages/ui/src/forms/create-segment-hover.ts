import { LIQUID_SEGMENT } from "../effect-layer/liquid-indicator.ts";
import {
  boxIn,
  CAN_HOVER_QUERY,
  createFill,
  follow,
  glideTo,
  HOVER_SPRING,
  placeAt,
  setShown,
  showTo,
  type Fill,
} from "../motion/create-fill.ts";
import type { MotionEngine } from "../motion/create-motion-engine.ts";

/**
 * The hover fill of a Segment track, on the fill and the spring of the hover
 * fill of a `NavList`. It stays on the last segment across a gap between two
 * segments, and glides under the indicator over the selected segment. A pointer
 * that is on a segment when the fill attaches, as after a page load, shows the
 * fill at once.
 *
 * @internal
 */
export function createSegmentHover(engine: MotionEngine, onDrawn: () => void) {
  let parts: {
    track: HTMLElement;
    fill: Fill;
    canHover: MediaQueryList;
  } | null = null;
  let hovered: Element | null = null;

  return {
    /** A ref for the fill, which is a direct child of the track. */
    ref: (element: HTMLElement) => {
      const track = element.parentElement;
      if (track === null) return;
      const fill = createFill(engine, element, HOVER_SPRING);
      const canHover = window.matchMedia(CAN_HOVER_QUERY);
      parts = { track, fill, canHover };
      const under = track.querySelector(`[${LIQUID_SEGMENT}]:hover`);
      if (under !== null && canHover.matches) {
        hovered = under;
        placeAt(fill, boxIn(track, under));
        setShown(fill, 1);
      }
      const observer =
        typeof ResizeObserver === "undefined"
          ? null
          : new ResizeObserver(() => {
              if (hovered !== null) {
                follow(fill, boxIn(track, hovered));
              }
            });
      observer?.observe(track);
      onDrawn();
      return () => {
        observer?.disconnect();
        fill.binding.unbind();
        parts = null;
        hovered = null;
      };
    },
    /** The pointer is over `target`. */
    over(target: EventTarget, pointerType: string) {
      if (parts === null) return;
      const { track, fill, canHover } = parts;
      if (pointerType !== "mouse" || !canHover.matches) return;
      const segment =
        target instanceof Element
          ? target.closest(`[${LIQUID_SEGMENT}]`)
          : null;
      if (segment === null || segment === hovered) return;
      hovered = segment;
      glideTo(fill, boxIn(track, segment), false);
    },
    /** The pointer left the track, or pressed it. */
    hide() {
      if (parts === null) return;
      hovered = null;
      showTo(parts.fill, false);
    },
  };
}
