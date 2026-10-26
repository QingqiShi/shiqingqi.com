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

/**
 * `RECEDE_SHAPE` for `element` as it shows now. Where the element is taller
 * than the viewport, as a view that the page scrolls, it shrinks from the
 * middle of the top edge of the viewport, and it is clipped to the part of
 * it in the viewport, so that it shows as one screen.
 *
 * @internal
 */
export function recedeShapeOf(element: HTMLElement): Styles {
  const { top, bottom } = element.getBoundingClientRect();
  const above = Math.max(0, -top);
  const below = Math.max(0, bottom - window.innerHeight);
  if (above < 0.5 && below < 0.5) return RECEDE_SHAPE;
  return {
    ...RECEDE_SHAPE,
    "transform-origin": `50% ${px(above)}`,
    "clip-path": `inset(${px(above)} 0 ${px(below)} 0 round ${border.radius_4})`,
  };
}

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
  // As `recedeShapeOf`, the element shrinks from the top of the viewport
  // where its top is above it.
  const top = Math.max(element.y, 0);
  return {
    x: mix(middle, rect.x, scale),
    y: mix(top, rect.y, scale) + RECEDE.drop * page,
    width: rect.width * scale,
    height: rect.height * scale,
  };
}
