import { createContext } from "react";
import { mix } from "../motion/mix.ts";
import type { Rect } from "../motion/play-layout.ts";
import { px, type Styles } from "../motion/px.ts";
import { border } from "../tokens.stylex.ts";

/**
 * The element that moves back while a `Sheet` slides over it below `md`, as
 * the screen under a sheet on a phone, or `null`. The sheet's motion moves
 * it, so that it moves with the card on the compositor.
 *
 * @internal
 */
export const SheetRecedeContext = createContext<HTMLElement | null>(null);

/** How much smaller the element gets, as a share of its size, and how far, in px, it drops. */
const RECEDE = { scale: 0.065, drop: 10 } as const;

/**
 * The styles that the element keeps while a sheet is over it: it shrinks
 * from the middle of its top edge and rounds its corners.
 *
 * @internal
 */
export const RECEDE_SHAPE: Styles = {
  "transform-origin": "50% 0",
  "border-radius": border.radius_4,
  "corner-shape": "squircle",
  overflow: "clip",
};

const scaleOf = (page: number) => 1 - RECEDE.scale * page;

/**
 * The transform of the element where the page is `page` of the way in:
 * 0 where no sheet is over it and 1 where a sheet is at rest over it.
 *
 * @internal
 */
export function recedePose(page: number): Styles {
  return {
    transform: `translateY(${px(RECEDE.drop * page)}) scale(${scaleOf(page).toFixed(4)})`,
  };
}

/**
 * Where `rect`, a box in `element` at its place with no transform, shows
 * where the page is `page` of the way in. `element` is the box of the
 * element at that place. Both are in the coordinates of the viewport.
 *
 * @internal
 */
export function recededRect(rect: Rect, element: Rect, page: number): Rect {
  const scale = scaleOf(page);
  const middle = element.x + element.width / 2;
  return {
    x: mix(middle, rect.x, scale),
    y: mix(element.y, rect.y, scale) + RECEDE.drop * page,
    width: rect.width * scale,
    height: rect.height * scale,
  };
}
