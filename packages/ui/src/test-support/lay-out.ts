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
