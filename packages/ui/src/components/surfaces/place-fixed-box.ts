import type { ViewportRect } from "./measure-geometry.ts";

/**
 * The offsets a `reach` box was last placed at, in px.
 *
 * @internal
 */
export interface BoxOffset {
  top: number;
  left: number;
}

/**
 * Writes the fixed box's corner — the element's rect less `reach` — to the
 * node, and returns the offsets it wrote.
 *
 * @internal
 */
export function placeFixedBox(
  box: HTMLElement,
  rect: ViewportRect,
  reach: number,
  applied: BoxOffset | null,
): BoxOffset {
  const origin = containingBlockOrigin(box, applied);
  const offset = {
    top: rect.top - reach - origin.top,
    left: rect.left - reach - origin.left,
  };
  box.style.top = `${String(offset.top)}px`;
  box.style.left = `${String(offset.left)}px`;
  return offset;
}

/**
 * Where the box's containing block starts — the viewport, or the nearest
 * ancestor with a transform, a filter or `contain`. A box already placed is
 * read where it stands, less the offsets written to it, so a containing block
 * that moves with the page stays right.
 */
function containingBlockOrigin(box: HTMLElement, applied: BoxOffset | null) {
  // The first placement has nothing to subtract, so the box goes to the origin
  // and is read there.
  if (applied === null) {
    box.style.top = "0px";
    box.style.left = "0px";
  }
  const placed = box.getBoundingClientRect();
  return {
    top: placed.top - (applied?.top ?? 0),
    left: placed.left - (applied?.left ?? 0),
  };
}
