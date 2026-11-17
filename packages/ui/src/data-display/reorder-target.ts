/**
 * The box of a row in the layout, on the block axis, in px.
 *
 * @internal
 */
export interface RowBox {
  readonly top: number;
  readonly height: number;
}

/**
 * The place that the row at `from` takes when a drag shows its top at `top`.
 * The row passes each other row whose middle its leading edge has passed: its
 * lower edge on the way down, and its upper edge on the way up. It stays
 * inside the rows from `first` to `last`. The boxes are where the rows are in
 * the layout, before the drag moves any of them, so rows of other heights
 * give the right place.
 *
 * @internal
 */
export function reorderTarget(
  boxes: readonly RowBox[],
  from: number,
  top: number,
  first: number,
  last: number,
): number {
  const bottom = top + boxes[from].height;
  const middleOf = (index: number) =>
    boxes[index].top + boxes[index].height / 2;
  let target = from;
  while (target < last && bottom > middleOf(target + 1)) target++;
  if (target !== from) return target;
  while (target > first && top < middleOf(target - 1)) target--;
  return target;
}

/**
 * How far each row shows from its place in the layout while the row at
 * `from` is over the place `to`: the rows between them make room for it. A
 * row that makes room moves by the height of the moved row and the gap next
 * to it.
 *
 * @internal
 */
export function roomOffsets(
  boxes: readonly RowBox[],
  from: number,
  to: number,
): number[] {
  const moved = boxes[from];
  const gapBelow =
    from + 1 < boxes.length
      ? boxes[from + 1].top - (moved.top + moved.height)
      : 0;
  const gapAbove =
    from > 0 ? moved.top - (boxes[from - 1].top + boxes[from - 1].height) : 0;
  return boxes.map((_, index) => {
    if (to > from && index > from && index <= to) {
      return -(moved.height + gapBelow);
    }
    if (to < from && index >= to && index < from) {
      return moved.height + gapAbove;
    }
    return 0;
  });
}
