import type { ElementBox } from "./read-element-box.ts";

/**
 * The signed distance from (`x`, `y`), measured from the top-left corner of
 * the border box, to its edge: below zero inside, zero on the edge. It is
 * `effectElementDistance` on the CPU, so that a shape on the CPU and a light
 * on the GPU meet the edge at the same place.
 *
 * @internal
 */
export function elementBoxDistance(
  box: Pick<ElementBox, "width" | "height" | "radii" | "cornerExponent">,
  x: number,
  y: number,
) {
  const halfWidth = box.width / 2;
  const halfHeight = box.height / 2;
  const localX = x - halfWidth;
  const localY = y - halfHeight;
  const [topLeft, topRight, bottomRight, bottomLeft] = box.radii;
  const radius =
    localX > 0
      ? localY > 0
        ? bottomRight
        : topRight
      : localY > 0
        ? bottomLeft
        : topLeft;
  const innerX = Math.abs(localX) - halfWidth + radius;
  const innerY = Math.abs(localY) - halfHeight + radius;
  const outsideX = Math.max(innerX, 0);
  const outsideY = Math.max(innerY, 0);
  let corner = Math.hypot(outsideX, outsideY);
  if (radius > 0 && box.cornerExponent !== 2) {
    const n = box.cornerExponent;
    corner =
      (Math.max(outsideX / radius, 1e-6) ** n +
        Math.max(outsideY / radius, 1e-6) ** n) **
        (1 / n) *
      radius;
  }
  return Math.min(Math.max(innerX, innerY), 0) + corner - radius;
}
