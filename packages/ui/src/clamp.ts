/**
 * `value` held between `min` and `max`. Where the range is empty, `min` wins,
 * so a box too large for the room keeps its start edge in view.
 *
 * @internal
 */
export function clamp(value: number, min: number, max: number) {
  return max < min ? min : Math.min(Math.max(value, min), max);
}
