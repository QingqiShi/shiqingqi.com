/**
 * How far a press moves along the track, in CSS px, before it is a drag and
 * not a click.
 *
 * @internal
 */
export const DRAG_THRESHOLD = 2;

/**
 * Where `clientY` is across the track, from -1 at its top to 1 at its bottom.
 *
 * @internal
 */
export function aimAt(rect: DOMRect, clientY: number) {
  const half = rect.height / 2;
  if (half <= 0) {
    return 0;
  }
  return Math.max(-1, Math.min(1, (clientY - rect.top - half) / half));
}

/**
 * Where `x` is as a stop index, fractional between two stop centres and held
 * at the first and the last stop.
 *
 * @internal
 */
export function indexAt(centres: readonly number[], x: number) {
  const after = centres.findIndex((centre) => centre > x);
  if (after <= 0) {
    return after === 0 ? 0 : centres.length - 1;
  }
  const before = centres[after - 1];
  return after - 1 + (x - before) / (centres[after] - before);
}
