import {
  LIQUID_INDICATOR,
  LIQUID_SEGMENT,
  LIQUID_VERTICAL,
} from "../effect-layer/liquid-indicator.ts";
import { layOut } from "./lay-out.ts";

/**
 * Mounts a segmented control's track with an indicator and two segments,
 * 40 px high, laid out at the top-left corner of the viewport, and counts
 * the reads of the segments' boxes in `segmentReads`. A vertical track
 * runs down the viewport. `layOutSegments` lays the segments out again at
 * new lengths.
 *
 * @internal
 */
export function mountSegmentTrack({ vertical = false } = {}) {
  const track = document.createElement("div");
  if (vertical) {
    track.setAttribute(LIQUID_VERTICAL, "");
  }
  const indicator = document.createElement("div");
  indicator.setAttribute(LIQUID_INDICATOR, "");
  const segments = [0, 1].map(() => {
    const segment = document.createElement("div");
    segment.setAttribute(LIQUID_SEGMENT, "");
    return segment;
  });
  track.append(indicator, ...segments);
  document.body.append(track);
  const segmentReads: Element[] = [];
  const turn = (box: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) =>
    vertical
      ? { x: box.y, y: box.x, width: box.height, height: box.width }
      : box;
  const layOutSegments = (lengths: readonly [number, number]) => {
    layOut(
      segments[0],
      turn({ x: 0, y: 0, width: lengths[0], height: 40 }),
      segmentReads,
    );
    layOut(
      segments[1],
      turn({ x: lengths[0], y: 0, width: lengths[1], height: 40 }),
      segmentReads,
    );
    layOut(
      track,
      turn({ x: 0, y: 0, width: lengths[0] + lengths[1], height: 40 }),
    );
  };
  layOutSegments([100, 100]);
  return { track, segments, segmentReads, layOutSegments };
}
