import { indicesIn } from "./plan-scopes.ts";
import type { ElementBox } from "./read-element-box.ts";
import type { EffectElementRecord, ElementRange } from "./types.ts";

/**
 * How many elements cast a shadow from one Lamp at most. The shader has
 * room for the same number.
 *
 * @internal
 */
export const MAX_OCCLUDERS = 8;

type BoxShape = Pick<ElementBox, "x" | "y" | "width" | "height" | "radii">;

/**
 * The signed distance from a point to an element's border box with its
 * corners rounded as circular arcs: below zero inside, zero on the edge.
 * The shader's `effectElementDistance`, less the superellipse corners.
 *
 * @internal
 */
export function distanceToBox(box: BoxShape, x: number, y: number) {
  const halfWidth = box.width / 2;
  const halfHeight = box.height / 2;
  const localX = x - box.x - halfWidth;
  const localY = y - box.y - halfHeight;
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
  const outside = Math.hypot(Math.max(innerX, 0), Math.max(innerY, 0));
  return Math.min(Math.max(innerX, innerY), 0) + outside - radius;
}

/**
 * The elements that cast a shadow from the Lamp at `records[index]`, the
 * nearest to its light first: those of `peers`, its scope on its `<canvas>`
 * element, whose edge is within `reach` of the light. The Lamp itself casts
 * none, nor does an element the light is inside, such as a card around the
 * Lamp, which would shade everything.
 *
 * @internal
 */
export function lampOccluders(
  records: readonly EffectElementRecord[],
  peers: ElementRange,
  index: number,
  light: { readonly x: number; readonly y: number },
  reach: number,
) {
  const near: { index: number; distance: number }[] = [];
  for (const other of indicesIn(peers)) {
    if (other === index) {
      continue;
    }
    const distance = distanceToBox(records[other], light.x, light.y);
    if (distance > 0 && distance < reach) {
      near.push({ index: other, distance });
    }
  }
  near.sort((a, b) => a.distance - b.distance);
  return near.slice(0, MAX_OCCLUDERS).map((item) => item.index);
}
