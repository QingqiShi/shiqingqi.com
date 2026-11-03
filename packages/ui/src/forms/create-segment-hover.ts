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

function boxInTrack(track: HTMLElement, segment: Element) {
  const origin = track.getBoundingClientRect();
  const box = boxIn(segment, origin);
  // A motion can scale a box that holds the track, and the fill is in that
  // scale too. Remove the scale from the measure, or the fill keeps the wrong
  // size after the motion stops. `offsetWidth` is a rounded value and has no
  // scale, so compare it only with a rounded value.
  const scale =
    Math.round(origin.width) === track.offsetWidth
      ? 1
      : origin.width / track.offsetWidth;
  return {
    x: box.x / scale - track.clientLeft,
    y: box.y / scale - track.clientTop,
    width: box.width / scale,
    height: box.height / scale,
  };
}

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
        placeAt(fill, boxInTrack(track, under));
        setShown(fill, 1);
      }
      const observer =
        typeof ResizeObserver === "undefined"
          ? null
          : new ResizeObserver(() => {
              if (hovered !== null) {
                follow(fill, boxInTrack(track, hovered));
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
      glideTo(fill, boxInTrack(track, segment), false);
    },
    /** The pointer left the track, or pressed it. */
    hide() {
      if (parts === null) return;
      hovered = null;
      showTo(parts.fill, false);
    },
  };
}
