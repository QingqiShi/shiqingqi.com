interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Lays out `element` at a viewport rectangle, and counts the reads of its
 * box in `reads`.
 *
 * @internal
 */
export function layOut(
  element: Element,
  { x, y, width, height }: Box,
  reads?: Element[],
) {
  element.getBoundingClientRect = () => {
    reads?.push(element);
    return rectAt({ x, y, width, height });
  };
}

/**
 * Lays out elements at boxes that follow the width of `column`: the width
 * that the inline style of `column` gives it, as for a moment while a motion
 * reads the layout, or else `width()`. The function that it returns lays out
 * an element at the box that `boxAt` gives for that width.
 *
 * @internal
 */
export function layOutInColumn(column: HTMLElement, width: () => number) {
  return (element: Element, boxAt: (width: number) => Box) => {
    element.getBoundingClientRect = () => {
      const given = Number.parseFloat(column.style.width);
      return rectAt(boxAt(Number.isNaN(given) ? width() : given));
    };
  };
}

function rectAt({ x, y, width, height }: Box): DOMRect {
  return {
    x,
    y,
    width,
    height,
    left: x,
    top: y,
    right: x + width,
    bottom: y + height,
    toJSON: () => ({}),
  };
}
