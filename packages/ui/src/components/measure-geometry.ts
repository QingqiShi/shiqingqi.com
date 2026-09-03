import type { BlurGeometry } from "./build-blur-layers.ts";

/**
 * A rect against the viewport, in px.
 *
 * @internal
 */
export interface ViewportRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * The blur's own box, in px.
 *
 * @internal
 */
export interface BoxSize {
  width: number;
  height: number;
}

/**
 * The union of the elements' viewport rects — `null` when there are none, or
 * the union is empty. An element with no box stands at the viewport origin, so
 * it is left out rather than dragging the union there.
 *
 * @internal
 */
export function unionRect(elements: HTMLCollection): ViewportRect | null {
  let left = Number.POSITIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  for (const element of elements) {
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    left = Math.min(left, rect.left);
    top = Math.min(top, rect.top);
    right = Math.max(right, rect.right);
    bottom = Math.max(bottom, rect.bottom);
  }
  if (right <= left || bottom <= top) return null;
  return { left, top, right, bottom };
}

/**
 * The root's box and the floating element's rect within it. `null` when the
 * root has no box, which leaves the layers unmasked.
 *
 * @internal
 */
export function measureGeometry(root: HTMLElement, rect: ViewportRect) {
  const rootRect = root.getBoundingClientRect();
  if (rootRect.width <= 0 || rootRect.height <= 0) return null;

  // Rounded so a subpixel jitter does not rewrite every mask string.
  return {
    width: Math.round(rootRect.width),
    height: Math.round(rootRect.height),
    left: Math.round(rect.left - rootRect.left),
    top: Math.round(rect.top - rootRect.top),
    right: Math.round(rect.right - rootRect.left),
    bottom: Math.round(rect.bottom - rootRect.top),
  };
}

/**
 * The geometry of a `reach` box, whose floating element is `reach` in from
 * every edge by construction. `null` until the box has been placed.
 *
 * @internal
 */
export function reachGeometry(
  reach: number,
  box: BoxSize | null,
): BlurGeometry | null {
  if (box === null) return null;
  return {
    width: box.width,
    height: box.height,
    left: reach,
    top: reach,
    right: box.width - reach,
    bottom: box.height - reach,
  };
}

/** @internal */
export function isSameGeometry(a: BlurGeometry | null, b: BlurGeometry) {
  return (
    a !== null &&
    a.width === b.width &&
    a.height === b.height &&
    a.left === b.left &&
    a.top === b.top &&
    a.right === b.right &&
    a.bottom === b.bottom
  );
}

/** @internal */
export function isSameSize(a: BoxSize | null, b: BoxSize) {
  return a !== null && a.width === b.width && a.height === b.height;
}
