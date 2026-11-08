/** @internal */
export interface Size {
  readonly width: number;
  readonly height: number;
}

/** @internal */
export interface Place {
  readonly x: number;
  readonly y: number;
}

/**
 * Places rectangles of `sizes` on shelves across a sheet `width` wide, the
 * tallest first, `gap` apart and `gap` from each edge, and gives the place
 * of each, in the order of `sizes`, or `null` for one that is wider than
 * the sheet. `height` is the height that the shelves fill.
 *
 * @internal
 */
export function packShelves(
  sizes: readonly Size[],
  width: number,
  gap: number,
): { readonly places: readonly (Place | null)[]; readonly height: number } {
  const places: (Place | null)[] = sizes.map(() => null);
  const order = sizes
    .map((size, index) => ({ size, index }))
    .filter(({ size }) => size.width + 2 * gap <= width)
    .toSorted((a, b) => b.size.height - a.size.height);
  let x = gap;
  let y = gap;
  let shelf = 0;
  for (const { size, index } of order) {
    if (x + size.width + gap > width) {
      x = gap;
      y += shelf + gap;
      shelf = 0;
    }
    places[index] = { x, y };
    x += size.width + gap;
    shelf = Math.max(shelf, size.height);
  }
  return { places, height: order.length === 0 ? 0 : y + shelf + gap };
}
