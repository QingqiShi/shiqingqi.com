import { useState, type PointerEvent, type Ref } from "react";
import { LIQUID_SEGMENT } from "../effect-layer/liquid-indicator.ts";
import { useLiquid } from "../effect-layer/use-liquid.ts";
import { mergeRefs } from "../merge-refs.ts";
import { DRAG_THRESHOLD, indexAt } from "./index-at.ts";

/** The segments of `track`, in the order of the options. */
function segmentsOf(track: HTMLElement) {
  return Array.from(track.querySelectorAll<HTMLElement>(`[${LIQUID_SEGMENT}]`));
}

/** A press on a segment, which a move along the track makes a drag. */
interface Press {
  readonly pointerId: number;
  readonly startX: number;
  /** The pressed segment. */
  readonly index: number;
  /** The segment elements, in the order of the options. */
  readonly elements: readonly HTMLElement[];
  /** Where each segment starts and ends, in the viewport. */
  readonly segments: readonly { left: number; right: number }[];
  /** The centre of each segment, in the viewport. */
  readonly centres: readonly number[];
  /** The ends of the track's padding box, in the viewport. */
  readonly paddingLeft: number;
  readonly paddingRight: number;
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
  const distance = ({ left, right }: Press["segments"][number]) =>
    Math.max(left - x, 0, x - right);
  return segments.reduce(
    (best, segment, index) =>
      distance(segment) < distance(segments[best]) ? index : best,
    0,
  );
}

/** Where the plain indicator is inside the track at `index`, in CSS px. */
function insetAt(press: Press, index: number) {
  const { segments } = press;
  const from = segments[Math.floor(index)];
  const to = segments[Math.ceil(index)];
  const share = index - Math.floor(index);
  return {
    left: from.left + (to.left - from.left) * share - press.paddingLeft,
    right: press.paddingRight - from.right - (to.right - from.right) * share,
  };
}

/**
 * Pointer-drag mechanics for a track of segments, the drag of the `Switch`
 * with a stop at each segment. A press on a segment moves the indicator
 * there at once. A move of `DRAG_THRESHOLD` along the track then drags it:
 * its centre follows the pointer between the first and the last segment,
 * and its width follows the segments under it. `end` gives the pressed
 * segment, or after a drag the segment under the indicator's centre. Each
 * segment is a native control, so the track captures the pointer only once
 * the press is a drag: a capture at the press would take the press away
 * from the segment.
 */
function useSegmentDrag() {
  const [held, setHeld] = useState<{ press: Press; x: number | null } | null>(
    null,
  );
  const segment =
    held === null
      ? null
      : held.x === null
        ? held.press.index
        : segmentAt(held.press.segments, held.x);
  const index =
    held === null || held.x === null
      ? null
      : indexAt(held.press.centres, held.x);

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
      const paddingLeft = track.getBoundingClientRect().left + track.clientLeft;
      const bounds = segments.map((segment) => {
        const { left, right } = segment.getBoundingClientRect();
        return { left, right };
      });
      setHeld({
        press: {
          pointerId: event.pointerId,
          startX: event.clientX,
          index: pressed,
          elements: segments,
          segments: bounds,
          centres: bounds.map(({ left, right }) => (left + right) / 2),
          paddingLeft,
          paddingRight: paddingLeft + track.clientWidth,
        },
        x: null,
      });
    },
    move(event: PointerEvent<HTMLElement>) {
      if (held === null || event.pointerId !== held.press.pointerId) {
        return;
      }
      if (
        held.x === null &&
        Math.abs(event.clientX - held.press.startX) < DRAG_THRESHOLD
      ) {
        return;
      }
      if (held.x === null) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      setHeld({ press: held.press, x: event.clientX });
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
        dragged: held.x !== null,
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
  /** A ref for the track, merged with the effect's. */
  ref?: Ref<T> | undefined;
  /** Called when a press ends on a segment, by a release and not a cancel. */
  onDrop: (drop: SegmentDrop) => void;
}

/**
 * The press, the drag and the liquid indicator of a track of segments,
 * shared by `SegmentedControl` and `TabBar`. Spread `handlers` on the track
 * and attach `trackRef` to it. Each segment carries `LIQUID_SEGMENT`, and
 * the indicator carries `LIQUID_INDICATOR`. `shown` is the segment that
 * looks selected: the selected one, or while a press is on, the one under
 * the indicator. `inset` places the plain indicator while a press holds it
 * off its anchor.
 *
 * @internal
 */
export function useSegmentPress<T extends HTMLElement>({
  selected,
  effect,
  ref,
  onDrop,
}: SegmentPressOptions<T>) {
  const [pressed, setPressed] = useState(false);
  const drag = useSegmentDrag();
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
