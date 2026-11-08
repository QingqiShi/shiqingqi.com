import type { Pill } from "./liquid-reader.ts";
import { segmentOf } from "./pill-at.ts";

/**
 * The first and the last stop whose segment the liquid owns the content of,
 * or `null` for none. It takes each stop whose segment comes within
 * `margin` of `extent`, keeps each stop of `owned` until its segment is more
 * than twice `margin` from it, and owns the stops between them too. All
 * lengths are in rest radii along the track.
 *
 * @internal
 */
export function ownedStops(
  stops: readonly Pill[],
  extent: readonly [number, number],
  owned: readonly [number, number] | null,
  margin: number,
): readonly [number, number] | null {
  let first = Number.POSITIVE_INFINITY;
  let last = Number.NEGATIVE_INFINITY;
  stops.forEach((stop, index) => {
    const [start, end] = segmentOf(stop);
    const gap = Math.max(start - extent[1], extent[0] - end, 0);
    const kept = owned !== null && index >= owned[0] && index <= owned[1];
    if (gap <= (kept ? 2 : 1) * margin) {
      first = Math.min(first, index);
      last = Math.max(last, index);
    }
  });
  return first > last ? null : [first, last];
}
