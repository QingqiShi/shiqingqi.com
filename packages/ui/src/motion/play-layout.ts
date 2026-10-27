import { bind, type Binding } from "./bind.ts";
import type { MotionEngine } from "./create-motion-engine.ts";
import { createMotionValue, type MotionValue } from "./create-motion-value.ts";
import { px } from "./px.ts";
import { springOf, springRoles, type Spring } from "./spring-roles.ts";

/** A box in px, relative to the box of an origin element. */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Whether two boxes share some area. Boxes that only touch do not. */
export function overlaps(first: Rect, second: Rect) {
  return (
    first.x < second.x + second.width &&
    second.x < first.x + first.width &&
    first.y < second.y + second.height &&
    second.y < first.y + first.height
  );
}

/** The area that two boxes share, with no size where they share none. */
export function intersect(first: Rect, second: Rect): Rect {
  const x = Math.max(first.x, second.x);
  const y = Math.max(first.y, second.y);
  const right = Math.min(first.x + first.width, second.x + second.width);
  const bottom = Math.min(first.y + first.height, second.y + second.height);
  return {
    x,
    y,
    width: Math.max(0, right - x),
    height: Math.max(0, bottom - y),
  };
}

/** The boxes of some elements at one time, from `captureLayout`. */
export interface LayoutSnapshot {
  readonly origin: Element;
  rectOf(element: Element): Rect | undefined;
}

/** How far, in px, an element shows from its place. */
export interface Offset {
  readonly dx: number;
  readonly dy: number;
}

const NO_OFFSETS: ReadonlyMap<Element, Offset> = new Map();

/** A move shorter than this, in px, does not play. */
export const MIN_MOVE = 0.5;

/**
 * Whether a move can write the `translate` of `element`: no other style
 * sets it. Read it with the motion at its layout pose.
 *
 * @internal
 */
export function canTranslate(element: HTMLElement | SVGElement) {
  if (element.style.getPropertyValue("translate") !== "") return false;
  const { translate } = getComputedStyle(element);
  return translate === "" || translate === "none";
}

/**
 * The box of `element` as the screen shows it now, relative to `origin`.
 *
 * @internal
 */
export function rectIn(element: Element, origin: DOMRect): Rect {
  const { left, top, width, height } = element.getBoundingClientRect();
  return { x: left - origin.left, y: top - origin.top, width, height };
}

/**
 * The boxes of `elements` as the screen shows them now, also mid motion,
 * relative to `origin`.
 */
export function captureLayout(
  elements: Iterable<Element>,
  origin: Element,
): LayoutSnapshot {
  const box = origin.getBoundingClientRect();
  const rects = new Map<Element, Rect>();
  for (const element of elements) rects.set(element, rectIn(element, box));
  return { origin, rectOf: (element) => rects.get(element) };
}

interface Move {
  readonly x: MotionValue;
  readonly y: MotionValue;
  readonly binding: Binding;
}

const movesOf = new WeakMap<MotionEngine, Map<Element, Move>>();

function movesIn(engine: MotionEngine) {
  let moves = movesOf.get(engine);
  if (moves === undefined) {
    moves = new Map();
    movesOf.set(engine, moves);
  }
  return moves;
}

function createMove(
  engine: MotionEngine,
  element: HTMLElement | SVGElement,
  spring: Spring,
): Move {
  const offset = () =>
    createMotionValue(engine, 0, { spring, precision: MIN_MOVE });
  const x = offset();
  const y = offset();
  const binding = bind(element, [x, y], {
    pose: (left, top) => ({ translate: `${px(left)} ${px(top)}` }),
    rest: "clear",
  });
  return { x, y, binding };
}

/**
 * The move of `element` that still plays, or a new one. A move that a stop
 * or `MotionEngine.destroy` ended has no binding, so it goes.
 */
function moveOf(
  engine: MotionEngine,
  element: HTMLElement | SVGElement,
  spring: Spring,
) {
  const moves = movesIn(engine);
  const running = moves.get(element);
  if (running !== undefined && (running.x.isMoving || running.y.isMoving)) {
    return running;
  }
  running?.binding.unbind();
  const move = createMove(engine, element, spring);
  moves.set(element, move);
  return move;
}

/**
 * The elements that a move of `playLayout` in `engine` still moves.
 *
 * @internal
 */
export function movingElements(engine: MotionEngine): Element[] {
  return [...(movesOf.get(engine) ?? [])]
    .filter(([, { x, y }]) => x.isMoving || y.isMoving)
    .map(([element]) => element);
}

/**
 * Springs each of `elements` from its box in `snapshot` to its box in the
 * layout now. An element inside another that moves takes only its own move,
 * also inside one of `moving`, which moves on its own from the offset it
 * has there. An element that moves already turns from where it is, at the
 * speed it has. The move writes only `translate`, so it adds to the
 * `transform` of the element, and an element that another style gives a
 * `translate` does not move.
 */
export function playLayout(
  engine: MotionEngine,
  snapshot: LayoutSnapshot,
  elements: Iterable<HTMLElement | SVGElement>,
  {
    spring = springOf(springRoles.move),
    moving = NO_OFFSETS,
  }: { spring?: Spring; moving?: ReadonlyMap<Element, Offset> } = {},
) {
  const moves = movesIn(engine);
  const offsets = engine.measure(() => {
    const box = snapshot.origin.getBoundingClientRect();
    const found = new Map<HTMLElement | SVGElement, Offset>();
    for (const element of elements) {
      const from = snapshot.rectOf(element);
      if (from === undefined || !canTranslate(element)) continue;
      const to = rectIn(element, box);
      found.set(element, { dx: from.x - to.x, dy: from.y - to.y });
    }
    return found;
  });

  const outerOf = (element: Element): Offset => {
    for (
      let node = element.parentElement;
      node !== null;
      node = node.parentElement
    ) {
      const outer = offsets.get(node) ?? moving.get(node);
      if (outer !== undefined) return outer;
    }
    return { dx: 0, dy: 0 };
  };

  for (const [element, { dx, dy }] of offsets) {
    const outer = outerOf(element);
    const ownX = dx - outer.dx;
    const ownY = dy - outer.dy;
    if (Math.hypot(ownX, ownY) < MIN_MOVE) continue;
    const move = moveOf(engine, element, spring);
    void Promise.all([
      move.x.to(0, { spring, from: ownX }).finished,
      move.y.to(0, { spring, from: ownY }).finished,
    ]).then(([landedX, landedY]) => {
      if (!landedX || !landedY) return;
      move.binding.unbind();
      if (moves.get(element) === move) moves.delete(element);
    });
  }
}
