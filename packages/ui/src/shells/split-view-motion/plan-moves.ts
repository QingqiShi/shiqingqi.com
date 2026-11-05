import type { MotionEngine } from "../../motion/create-motion-engine.ts";
import { captureBoxes, pickBoxes } from "../../motion/pick-boxes.ts";
import {
  intersect,
  movingElements,
  playLayout,
  rectIn,
  type LayoutSnapshot,
  type Rect,
} from "../../motion/play-layout.ts";
import { writeStyles } from "../../motion/px.ts";
import { springOf, springRoles } from "../../motion/spring-roles.ts";
import { SELECTOR } from "./is-view-stacked.ts";
import type { SplitViewMarkElement } from "./types.ts";

const noStart = () => {};

/**
 * Moves each Shared element in `moved` from its box there, and each box
 * of the content page that `pickBoxes` picks from its box in `boxes`, in
 * one `playLayout`, so that a box inside another that moves takes only its
 * own move. The content column shows `shift` px from its place as the
 * motion starts and springs back on its own, so a box in it moves `shift`
 * px less.
 *
 * @internal
 */
export function planMoves(
  engine: MotionEngine,
  view: HTMLElement,
  content: HTMLElement | null,
  boxes: LayoutSnapshot | null,
  moved: ReadonlyMap<SplitViewMarkElement, Rect>,
  flying: readonly Element[],
  shift: number,
) {
  const page =
    content?.querySelector<HTMLElement>(SELECTOR.page("current")) ?? null;
  const offset = { dx: shift, dy: 0 };
  const from = new Map<HTMLElement | SVGElement, Rect>(
    boxes === null || page === null
      ? []
      : pickBoxes(page, boxes, { avoid: flying, offset }),
  );
  for (const [element, rect] of moved) from.set(element, rect);
  if (from.size === 0) return noStart;
  const fromOf: ReadonlyMap<Element, Rect> = from;
  const moving = new Map<Element, typeof offset>(
    content === null ? [] : [[content, offset]],
  );
  return () => {
    playLayout(
      engine,
      { origin: view, rectOf: (element) => fromOf.get(element) },
      from.keys(),
      { spring: springOf(springRoles.move), moving },
    );
  };
}

/**
 * The boxes of the content page as the screen showed them, from `x`,
 * where the inline-start edge of `content` showed, from the view's, and
 * `width`, the width it had. The content column takes that width for the
 * read and lets go of it in the same task. The page shows the DOM of now,
 * which can differ from what showed, such as a row that is now selected.
 *
 * @internal
 */
export function boxesAt(
  engine: MotionEngine,
  view: HTMLElement,
  content: HTMLElement,
  x: number,
  width: number,
): LayoutSnapshot | null {
  const page = content.querySelector(SELECTOR.page("current"));
  if (page === null || width <= 0) return null;
  const style = content.style.cssText;
  const given = `${String(width)}px`;
  writeStyles(content, {
    "box-sizing": "border-box",
    "flex-grow": "0",
    "flex-shrink": "0",
    "flex-basis": "auto",
    width: given,
    "min-width": given,
    "max-width": given,
  });
  // Read with the poses of the motion on, so that a box that still moves
  // shows where it is.
  try {
    const origin = view.getBoundingClientRect();
    const column = rectIn(content, origin);
    const dx = x - column.x;
    const screen = {
      x: -origin.left - dx,
      y: -origin.top,
      width: innerWidth,
      height: innerHeight,
    };
    // The pages clip what they hold to the column, and the screen clips
    // the column.
    const boxes = captureBoxes(page, view, intersect(column, screen), {
      moving: movingElements(engine),
    });
    return {
      origin: view,
      rectOf: (element) => {
        const rect = boxes.rectOf(element);
        return rect === undefined ? undefined : { ...rect, x: rect.x + dx };
      },
    };
  } finally {
    content.style.cssText = style;
  }
}
