import {
  useState,
  type DOMAttributes,
  type PointerEvent,
  type Ref,
} from "react";
import {
  LIQUID_INDICATOR,
  LIQUID_SEGMENT,
  LIQUID_VERTICAL,
} from "../effect-layer/liquid-indicator.ts";
import { useLiquid } from "../effect-layer/use-liquid.ts";
import { mergeRefs } from "../merge-refs.ts";
import { DRAG_THRESHOLD, indexAt } from "./index-at.ts";
import {
  segmentSurfaces,
  segmentTrack,
  segmentTrackMarker,
} from "./segment-track.stylex.ts";

/** The segments of `track`, in the order of the options. */
function segmentsOf(track: HTMLElement) {
  return Array.from(track.querySelectorAll<HTMLElement>(`[${LIQUID_SEGMENT}]`));
}

/**
 * The way the segments of a track follow each other: side by side, or one
 * over the next.
 */
type SegmentOrientation = "horizontal" | "vertical";

/** Where a span starts and ends along the track, in the viewport. */
interface Span {
  readonly start: number;
  readonly end: number;
}

/** A press on a segment, which a move along the track makes a drag. */
interface Press {
  readonly pointerId: number;
  /** Where the press started along the track, in the viewport. */
  readonly startAt: number;
  /** The pressed segment. */
  readonly index: number;
  /** The segment elements, in the order of the options. */
  readonly elements: readonly HTMLElement[];
  /** Where each segment starts and ends along the track. */
  readonly segments: readonly Span[];
  /** The centre of each segment along the track, in the viewport. */
  readonly centres: readonly number[];
  /** The ends of the track's padding box along the track. */
  readonly padding: Span;
}

/**
 * Where a press ended: on the segment under the indicator.
 *
 * @internal
 */
export interface SegmentDrop {
  /** The segment under the indicator's centre. */
  readonly index: number;
  /** That segment's element. */
  readonly element: HTMLElement;
  /** The press moved along the track by `DRAG_THRESHOLD` or more. */
  readonly dragged: boolean;
}

/** The segment under `x`, or the nearest one where `x` is in a gap. */
function segmentAt(segments: Press["segments"], x: number) {
  const distance = ({ start, end }: Span) => Math.max(start - x, 0, x - end);
  return segments.reduce(
    (best, segment, index) =>
      distance(segment) < distance(segments[best]) ? index : best,
    0,
  );
}

/**
 * Where the plain indicator is inside the track at `index`, in CSS px from
 * the start and from the end of the track along it.
 */
function insetAt(press: Press, index: number): Span {
  const { segments, padding } = press;
  const from = segments[Math.floor(index)];
  const to = segments[Math.ceil(index)];
  const share = index - Math.floor(index);
  return {
    start: from.start + (to.start - from.start) * share - padding.start,
    end: padding.end - from.end - (to.end - from.end) * share,
  };
}

function spanOf(rect: DOMRect, vertical: boolean): Span {
  return vertical
    ? { start: rect.top, end: rect.bottom }
    : { start: rect.left, end: rect.right };
}

/**
 * Pointer-drag mechanics for a track of segments, the drag of the `Switch`
 * with a stop at each segment. A press on a segment moves the indicator
 * there at once. A move of `DRAG_THRESHOLD` along the track then drags it:
 * its centre follows the pointer between the first and the last segment,
 * and its length follows the segments under it. `end` gives the pressed
 * segment, or after a drag the segment under the indicator's centre. Each
 * segment is a native control, so the track captures the pointer only once
 * the press is a drag: a capture at the press would take the press away
 * from the segment.
 */
function useSegmentDrag(orientation: SegmentOrientation) {
  const vertical = orientation === "vertical";
  const along = (event: PointerEvent) =>
    vertical ? event.clientY : event.clientX;
  const [held, setHeld] = useState<{ press: Press; at: number | null } | null>(
    null,
  );
  const segment =
    held === null
      ? null
      : held.at === null
        ? held.press.index
        : segmentAt(held.press.segments, held.at);
  const index =
    held === null || held.at === null
      ? null
      : indexAt(held.press.centres, held.at);

  function cancel() {
    setHeld(null);
  }

  return {
    /** The pressed segment, where the indicator goes until the release. */
    pressed: held?.press.index ?? null,
    /** Where a drag holds the indicator's centre, as a segment index. */
    index,
    /** The segment under the indicator, which looks selected until the release. */
    segment,
    inset:
      held === null ? null : insetAt(held.press, index ?? held.press.index),
    start(event: PointerEvent<HTMLElement>) {
      const track = event.currentTarget;
      const segments = segmentsOf(track);
      const pressed = segments.findIndex(
        (segment) =>
          event.target instanceof Node && segment.contains(event.target),
      );
      if (pressed < 0 || segments[pressed].matches(":disabled")) {
        return;
      }
      const box = spanOf(track.getBoundingClientRect(), vertical);
      const paddingStart =
        box.start + (vertical ? track.clientTop : track.clientLeft);
      const bounds = segments.map((segment) =>
        spanOf(segment.getBoundingClientRect(), vertical),
      );
      setHeld({
        press: {
          pointerId: event.pointerId,
          startAt: along(event),
          index: pressed,
          elements: segments,
          segments: bounds,
          centres: bounds.map(({ start, end }) => (start + end) / 2),
          padding: {
            start: paddingStart,
            end:
              paddingStart +
              (vertical ? track.clientHeight : track.clientWidth),
          },
        },
        at: null,
      });
    },
    move(event: PointerEvent<HTMLElement>) {
      if (held === null || event.pointerId !== held.press.pointerId) {
        return;
      }
      const at = along(event);
      if (
        held.at === null &&
        Math.abs(at - held.press.startAt) < DRAG_THRESHOLD
      ) {
        return;
      }
      if (held.at === null) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      setHeld({ press: held.press, at });
    },
    end(event: PointerEvent<HTMLElement>): SegmentDrop | null {
      setHeld(null);
      if (held === null || event.pointerId !== held.press.pointerId) {
        return null;
      }
      const dropped = segment ?? held.press.index;
      return {
        index: dropped,
        element: held.press.elements[dropped],
        dragged: held.at !== null,
      };
    },
    cancel,
  };
}

const INDICATOR = { "aria-hidden": "true", [LIQUID_INDICATOR]: "" } as const;
const SEGMENT = { [LIQUID_SEGMENT]: "" };

/** @internal */
export interface SegmentTrackOptions<T extends HTMLElement> {
  /** The segment the indicator rests on, or -1 for none. */
  selected: number;
  /** Draws the indicator as liquid on the effect layer, or not at all. */
  effect: "liquid" | "none";
  /** The selected surface that the indicator paints. */
  surface: keyof typeof segmentSurfaces;
  /**
   * How the segments follow each other, and so the axis a drag moves the
   * indicator on.
   *
   * @default "horizontal"
   */
  orientation?: SegmentOrientation | undefined;
  /**
   * The track scrolls, so a drag down a vertical track scrolls it and touch
   * reaches each segment.
   */
  scrolls?: boolean | undefined;
  /** A ref for the track, merged with the effect's. */
  ref?: Ref<T> | undefined;
  /** The caller's own handlers. Its pointer handlers run before the track's. */
  handlers?: DOMAttributes<T> | undefined;
  /** Called when a press ends on a segment, by a release and not a cancel. */
  onDrop: (drop: SegmentDrop) => void;
}

/**
 * A Segment track: the press, the drag, the indicator and the liquid
 * effect of a track of segments, shared by `SegmentedControl`, `TabBar` and
 * the rail of `TabView`. It writes the attributes that the liquid effect
 * reads. Spread `props` on the track with `css`, render the indicator with
 * `indicator` and `indicatorCss` as the first child of the track, and give
 * each segment `segment(index)` and `segmentCss(index)`. `shown` is the
 * segment that looks selected: the selected one, or while a press is on,
 * the one under the indicator.
 *
 * @internal
 */
export function useSegmentTrack<T extends HTMLElement>({
  selected,
  effect,
  surface,
  orientation = "horizontal",
  scrolls = false,
  ref,
  handlers = {},
  onDrop,
}: SegmentTrackOptions<T>) {
  const vertical = orientation === "vertical";
  const [pressed, setPressed] = useState(false);
  const drag = useSegmentDrag(orientation);
  const liquidRef = useLiquid({
    position: drag.pressed ?? selected,
    drag: drag.index,
    pressed,
  });
  const shown = drag.segment ?? selected;
  const { inset } = drag;

  return {
    shown,
    props: {
      ref: mergeRefs<T>(ref, effect === "liquid" ? liquidRef : undefined),
      ...(vertical ? { [LIQUID_VERTICAL]: "" } : {}),
      onPointerDown: (event: PointerEvent<T>) => {
        handlers.onPointerDown?.(event);
        if (event.pointerType !== "mouse" || event.button === 0) {
          setPressed(true);
          drag.start(event);
        }
      },
      onPointerMove: (event: PointerEvent<T>) => {
        handlers.onPointerMove?.(event);
        drag.move(event);
      },
      onPointerUp: (event: PointerEvent<T>) => {
        handlers.onPointerUp?.(event);
        setPressed(false);
        const drop = drag.end(event);
        if (drop !== null) {
          onDrop(drop);
        }
      },
      onPointerCancel: (event: PointerEvent<T>) => {
        handlers.onPointerCancel?.(event);
        setPressed(false);
        drag.cancel();
      },
      onPointerLeave: (event: PointerEvent<T>) => {
        handlers.onPointerLeave?.(event);
        if (drag.index === null) {
          setPressed(false);
          drag.cancel();
        }
      },
    },
    css: [
      segmentTrackMarker,
      segmentTrack.track,
      vertical && !scrolls && segmentTrack.trackVertical,
      segmentSurfaces[surface],
    ],
    indicator: INDICATOR,
    indicatorCss: [
      segmentTrack.indicator,
      inset !== null &&
        (vertical
          ? segmentTrack.atBlock(inset.start, inset.end)
          : segmentTrack.at(inset.start, inset.end)),
      drag.index !== null && segmentTrack.dragged,
    ],
    segment: (_index: number) => SEGMENT,
    segmentCss: (index: number) => [
      drag.pressed !== null && segmentTrack.held,
      index === shown && segmentTrack.shown,
    ],
  };
}
