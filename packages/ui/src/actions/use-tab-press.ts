import { useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { LIQUID_SEGMENT } from "../effect-layer/liquid-indicator.ts";
import {
  useSegmentPress,
  type SegmentOrientation,
} from "../forms/use-segment-press.ts";

/**
 * Whether a click opens the link in place, with no key and no other button.
 *
 * @internal
 */
export function isPlainClick(event: MouseEvent) {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

interface TabPressOptions {
  /** The tab of the page the visitor is on, or -1 for none. */
  current: number;
  /** Draws the indicator as liquid on the effect layer, or not at all. */
  effect: "liquid" | "none";
  /** How the tabs follow each other on the track. */
  orientation?: SegmentOrientation | undefined;
}

/**
 * The press, the drag and the indicator of a track of links to the
 * top-level destinations, shared by `TabBar` and the rail of `TabView`. A
 * press on a tab moves the indicator there at once, and a drag from it
 * moves the indicator across the tabs. A release after a drag follows the
 * link under the indicator; a tap follows the tab's own link, as a click
 * does. The indicator stays on the tab a click went to until its page is
 * the current one. Spread `trackProps` on the track, a `<div>`, and attach
 * `trackRef` to it, and spread `linkProps(index)` on each link.
 *
 * @internal
 */
export function useTabPress({ current, effect, orientation }: TabPressOptions) {
  // The tab a click went to, held under the indicator until the page it
  // opens is the current one.
  const [followed, setFollowed] = useState<{
    index: number;
    from: number;
  } | null>(null);
  if (followed !== null && followed.from !== current) {
    setFollowed(null);
  }
  // The tab that a tap released on. The indicator stays on it until the
  // click that the release causes. In iOS Safari, this click can come many
  // frames after the release.
  const [tapped, setTapped] = useState<number | null>(null);
  const resting = tapped ?? followed?.index ?? current;
  const droppedRef = useRef(false);
  const { trackRef, shown, held, inset, dragging, handlers } =
    useSegmentPress<HTMLDivElement>({
      selected: resting,
      effect,
      orientation,
      onDrop(drop) {
        if (drop.dragged) {
          droppedRef.current = true;
          drop.element.click();
        } else {
          setTapped(drop.index);
        }
      },
    });

  return {
    trackRef,
    /** The tab that looks current: under the indicator, or where it rests. */
    shown,
    /** A press is on a tab, so no hover fill should cover the indicator. */
    held,
    inset,
    dragging,
    trackProps: {
      ...handlers,
      onPointerDown: (event: PointerEvent<HTMLElement>) => {
        droppedRef.current = false;
        setTapped(null);
        handlers.onPointerDown(event);
      },
      onClickCapture: (event: MouseEvent<HTMLElement>) => {
        setTapped(null);
        // A drag follows the link under the indicator on release, so the
        // click that the pointer makes after it goes nowhere. A click
        // with no pointer has a detail of 0 and goes on to the link.
        if (droppedRef.current && event.detail > 0) {
          droppedRef.current = false;
          event.preventDefault();
          event.stopPropagation();
        }
      },
    },
    linkProps: (index: number) => ({
      draggable: false,
      onClick: (event: MouseEvent<HTMLAnchorElement>) => {
        if (isPlainClick(event)) {
          setFollowed({ index, from: current });
        }
      },
      [LIQUID_SEGMENT]: "",
    }),
  };
}
