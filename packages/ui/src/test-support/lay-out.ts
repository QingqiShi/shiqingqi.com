/**
 * Lays out `element` at a viewport rectangle, and counts the reads of its
 * box in `reads`.
 *
 * @internal
 */
export function layOut(
  element: Element,
  {
    x,
    y,
    width,
    height,
  }: { x: number; y: number; width: number; height: number },
  reads?: Element[],
) {
  element.getBoundingClientRect = () => {
    reads?.push(element);
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
  };
}
