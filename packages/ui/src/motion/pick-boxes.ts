import {
  canTranslate,
  MIN_MOVE,
  overlaps,
  rectIn,
  type LayoutSnapshot,
  type Offset,
  type Rect,
} from "./play-layout.ts";

/** How many levels under its root a box can be and still move on its own. */
const MAX_DEPTH = 24;
/** How many boxes one capture reads at most. */
const MAX_BOXES = 2000;
/** A change of width or height smaller than this, in px, keeps the size. */
const SAME_SIZE = 0.5;

const STILL: Offset = { dx: 0, dy: 0 };

function isEmpty({ width, height }: Rect) {
  return width === 0 && height === 0;
}

function isSameSize(first: Rect, second: Rect) {
  return (
    Math.abs(first.width - second.width) < SAME_SIZE &&
    Math.abs(first.height - second.height) < SAME_SIZE
  );
}

/** The children of `element` that a move can go into: not the parts of an SVG drawing. */
function childrenOf(element: Element) {
  return element instanceof SVGElement ? [] : element.children;
}

/**
 * Calls `visit` for each element in `root`, not `root` itself, from the
 * outside in. The walk goes into an element only where `visit` returns
 * `true`.
 */
function walk(root: Element, visit: (element: Element) => boolean) {
  const go = (element: Element, depth: number) => {
    if (!visit(element) || depth >= MAX_DEPTH) return;
    for (const child of childrenOf(element)) go(child, depth + 1);
  };
  for (const child of root.children) go(child, 1);
}

/**
 * Whether a move can move `element`: it does not move an inline box, nor a
 * box that another style gives a `translate`.
 */
function canMove(element: Element): element is HTMLElement | SVGSVGElement {
  if (!(element instanceof HTMLElement || element instanceof SVGSVGElement)) {
    return false;
  }
  return (
    getComputedStyle(element).display !== "inline" && canTranslate(element)
  );
}

/**
 * The boxes in `root`, not `root` itself, that show in `bounds`, as the
 * screen shows them now, also mid motion, relative to `origin`. A box that
 * does not show in `bounds` is not read, and nor are the boxes in it, so a
 * long list costs only the rows that show. A box with no size, such as one
 * with `display: contents`, is not kept, but the boxes in it are. A box in
 * `moving`, such as one that a move of `playLayout` still moves, is read
 * also where it does not show, and so are the boxes that hold it, so that
 * the next move turns it from where it is.
 *
 * @internal
 */
export function captureBoxes(
  root: Element,
  origin: Element,
  bounds: Rect,
  { moving = [] }: { moving?: Iterable<Element> } = {},
): LayoutSnapshot {
  const box = origin.getBoundingClientRect();
  const kept = new Set<Element>();
  for (const element of moving) {
    if (!root.contains(element)) continue;
    for (
      let node: Element | null = element;
      node !== null && node !== root && !kept.has(node);
      node = node.parentElement
    ) {
      kept.add(node);
    }
  }
  const rects = new Map<Element, Rect>();
  walk(root, (element) => {
    if (rects.size >= MAX_BOXES) return false;
    const rect = rectIn(element, box);
    if (isEmpty(rect)) return true;
    if (!overlaps(rect, bounds) && !kept.has(element)) return false;
    rects.set(element, rect);
    return true;
  });
  return { origin, rectOf: (element) => rects.get(element) };
}

/**
 * The boxes in `root` that move as one from their boxes in `before` to
 * their boxes in the layout now, each with its box in `before`. A box that
 * keeps its size moves as one, with all that it holds. A box that changes
 * its size does not move: the boxes in it are picked by the same rule. Thus
 * in a list that gets narrower, an amount at the inline end moves and the
 * text at the start stays, and text that wraps again changes at once. A box
 * that is not in `before`, such as one that did not show, does not move.
 *
 * Nothing moves that is in `avoid` or holds an element of it, such as a
 * Shared element that flies, but the other boxes in a box that holds one
 * can move. Where `root` shows `offset` from its place as the move starts,
 * a box moves only where it shows at another place in `root`. Read it with
 * the motion at its layout pose.
 *
 * @internal
 */
export function pickBoxes(
  root: Element,
  before: LayoutSnapshot,
  {
    avoid = [],
    offset = STILL,
  }: { avoid?: Iterable<Element>; offset?: Offset } = {},
) {
  const box = before.origin.getBoundingClientRect();
  const avoided = new Set(avoid);
  const holders = new Set<Element>();
  for (const element of avoided) {
    for (
      let node = element.parentElement;
      node !== null && !holders.has(node);
      node = node.parentElement
    ) {
      holders.add(node);
    }
  }
  const picked = new Map<HTMLElement | SVGSVGElement, Rect>();
  walk(root, (element) => {
    if (avoided.has(element)) return false;
    const from = before.rectOf(element);
    const to = rectIn(element, box);
    if (from === undefined) return isEmpty(to);
    if (holders.has(element) || !isSameSize(from, to)) return true;
    const dx = from.x - offset.dx - to.x;
    const dy = from.y - offset.dy - to.y;
    if (Math.hypot(dx, dy) < MIN_MOVE) return false;
    if (!canMove(element)) return true;
    picked.set(element, from);
    return false;
  });
  return picked;
}
