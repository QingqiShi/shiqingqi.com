import { useState, type PointerEvent, type Ref } from "react";
import {
  LIQUID_SEGMENT,
  LIQUID_VERTICAL,
} from "../effect-layer/liquid-indicator.ts";
import { useLiquid } from "../effect-layer/use-liquid.ts";
import { mergeRefs } from "../merge-refs.ts";
import { DRAG_THRESHOLD, indexAt } from "./index-at.ts";

/** The segments of `track`, in the order of the options. */
function segmentsOf(track: HTMLElement) {
  return Array.from(track.querySelectorAll<HTMLElement>(`[${LIQUID_SEGMENT}]`));
}

/**
 * The way the segments of a track follow each other: side by side, or one
 * over the next.
 *
 * @internal
 */
export type SegmentOrientation = "horizontal" | "vertical";

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

interface SegmentPressOptions<T extends HTMLElement> {
  /** The segment the indicator rests on, or -1 for none. */
  selected: number;
  /** Draws the indicator as liquid on the effect layer, or not at all. */
  effect: "liquid" | "none";
  /**
   * How the segments follow each other, and so the axis a drag moves the
   * indicator on.
   *
   * @default "horizontal"
   */
  orientation?: SegmentOrientation | undefined;
  /** A ref for the track, merged with the effect's. */
  ref?: Ref<T> | undefined;
  /** Called when a press ends on a segment, by a release and not a cancel. */
  onDrop: (drop: SegmentDrop) => void;
}

/**
 * The press, the drag and the liquid indicator of a track of segments,
 * shared by `SegmentedControl`, `TabBar` and the rail of `TabView`. Spread
 * `handlers` on the track, which also marks a vertical track with
 * `LIQUID_VERTICAL`, and attach `trackRef` to it. Each segment carries
 * `LIQUID_SEGMENT`, and the indicator carries `LIQUID_INDICATOR`. `shown`
 * is the segment that looks selected: the selected one, or while a press is
 * on, the one under the indicator. `inset` places the plain indicator while
 * a press holds it off its anchor: its distance from the start and from the
 * end of the track's padding box, along the track.
 *
 * @internal
 */
export function useSegmentPress<T extends HTMLElement>({
  selected,
  effect,
  orientation = "horizontal",
  ref,
  onDrop,
}: SegmentPressOptions<T>) {
  const [pressed, setPressed] = useState(false);
  const drag = useSegmentDrag(orientation);
  const liquidRef = useLiquid({
    position: drag.pressed ?? selected,
    drag: drag.index,
    pressed,
  });
  const effectRef = effect === "liquid" ? liquidRef : undefined;
  const trackRef = mergeRefs<T>(ref, effectRef);

  return {
    trackRef,
    shown: drag.segment ?? selected,
    /** A press is on a segment, so no hover fill should cover the indicator. */
    held: drag.pressed !== null,
    inset: drag.inset,
    dragging: drag.index !== null,
    handlers: {
      ...(orientation === "vertical" ? { [LIQUID_VERTICAL]: "" } : {}),
      onPointerDown: (event: PointerEvent<HTMLElement>) => {
        if (event.pointerType !== "mouse" || event.button === 0) {
          setPressed(true);
          drag.start(event);
        }
      },
      onPointerMove: (event: PointerEvent<HTMLElement>) => {
        drag.move(event);
      },
      onPointerUp: (event: PointerEvent<HTMLElement>) => {
        setPressed(false);
        const drop = drag.end(event);
        if (drop !== null) {
          onDrop(drop);
        }
      },
      onPointerCancel: () => {
        setPressed(false);
        drag.cancel();
      },
      onPointerLeave: () => {
        if (drag.index === null) {
          setPressed(false);
          drag.cancel();
        }
      },
    },
  };
}
