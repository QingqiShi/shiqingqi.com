import type { PageRect } from "./lens-from-box.ts";

/**
 * Where a Lamp's light comes from: the centre of its element's `::before`
 * disc, in the same coordinates as the element's box, and the disc's radius.
 *
 * @internal
 */
export interface LampSource {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}

/**
 * The horizontal translation of a computed `transform`, in CSS px: the
 * fifth value of a `matrix()`, the thirteenth of a `matrix3d()`, or 0 for
 * `none` or anything else.
 *
 * @internal
 */
export function parseTranslateX(transform: string) {
  const match = /^(matrix3d|matrix)\((.*)\)$/.exec(transform.trim());
  if (match === null) {
    return 0;
  }
  const values = match[2].split(",").map((value) => Number.parseFloat(value));
  const translate = values[match[1] === "matrix3d" ? 12 : 4];
  return Number.isFinite(translate) ? translate : 0;
}

/**
 * The light of a Lamp whose `::before` is a disc `thumbWidth` wide, laid
 * out at the start of the element's padding box and moved `translateX`
 * along it: the Switch's thumb. The disc sits in the middle of the
 * element's height.
 *
 * @internal
 */
export function lampSource(
  box: PageRect,
  paddingLeft: number,
  thumbWidth: number,
  translateX: number,
): LampSource {
  const radius = Math.max(thumbWidth, 1) / 2;
  return {
    x: box.x + paddingLeft + radius + translateX,
    y: box.y + box.height / 2,
    radius,
  };
}
