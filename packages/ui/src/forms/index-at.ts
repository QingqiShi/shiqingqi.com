/**
 * How far a press moves along the track, in CSS px, before it is a drag and
 * not a click.
 *
 * @internal
 */
export const DRAG_THRESHOLD = 2;

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
