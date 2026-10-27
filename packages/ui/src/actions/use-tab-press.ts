import { useRef, useState, type MouseEvent } from "react";
import {
  useSegmentTrack,
  type SegmentTrackOptions,
} from "../forms/use-segment-track.ts";

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

interface TabPressOptions extends Pick<
  SegmentTrackOptions<HTMLDivElement>,
  "effect" | "surface" | "orientation" | "scrolls"
> {
  /** The tab of the page the visitor is on, or -1 for none. */
  current: number;
}

/**
 * The press, the drag and the indicator of a track of links to the
 * top-level destinations, shared by `TabBar` and the rail of `TabView`. A
 * press on a tab moves the indicator there at once, and a drag from it
 * moves the indicator across the tabs. A release after a drag follows the
 * link under the indicator; a tap follows the tab's own link, as a click
 * does. The indicator stays on the tab a click went to until its page is
 * the current one. It returns what `useSegmentTrack` returns, with the
 * track a `<div>` and each segment a link.
 *
 * @internal
 */
export function useTabPress({ current, ...options }: TabPressOptions) {
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
  const track = useSegmentTrack<HTMLDivElement>({
    ...options,
    selected: resting,
    handlers: {
      onPointerDown() {
        droppedRef.current = false;
        setTapped(null);
      },
    },
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
    ...track,
    props: {
      ...track.props,
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
    segment: (index: number) => ({
      ...track.segment(index),
      draggable: false,
      onClick: (event: MouseEvent<HTMLAnchorElement>) => {
        if (isPlainClick(event)) {
          setFollowed({ index, from: current });
        }
      },
    }),
  };
}
