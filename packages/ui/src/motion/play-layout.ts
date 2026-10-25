import { bind, type Binding } from "./bind.ts";
import type { MotionEngine } from "./create-motion-engine.ts";
import { createMotionValue, type MotionValue } from "./create-motion-value.ts";
import { px } from "./px.ts";
import { springOf, springRoles, type Spring } from "./spring-roles.ts";

/** @internal */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** @internal */
export interface LayoutSnapshot {
  readonly origin: Element;
  rectOf(element: Element): Rect | undefined;
}

/** A move shorter than this, in px, does not play. */
const MIN_MOVE = 0.5;

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
 *
 * @internal
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
    pose: (left, top) => ({ transform: `translate(${px(left)}, ${px(top)})` }),
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
 * Springs each of `elements` from its box in `snapshot` to its box in the
 * layout now. An element inside another that moves takes only its own move.
 * An element that moves already turns from where it is, at the speed it has.
 *
 * @internal
 */
export function playLayout(
  engine: MotionEngine,
  snapshot: LayoutSnapshot,
  elements: Iterable<HTMLElement | SVGElement>,
  { spring = springOf(springRoles.move) }: { spring?: Spring } = {},
) {
  const moves = movesIn(engine);
  const offsets = engine.measure(() => {
    const box = snapshot.origin.getBoundingClientRect();
    const found = new Map<
      HTMLElement | SVGElement,
      { dx: number; dy: number }
    >();
    for (const element of elements) {
      const from = snapshot.rectOf(element);
      if (from === undefined) continue;
      const to = rectIn(element, box);
      found.set(element, { dx: from.x - to.x, dy: from.y - to.y });
    }
    return found;
  });

  const outerOf = (element: Element) => {
    for (
      let node = element.parentElement;
      node !== null;
      node = node.parentElement
    ) {
      const outer = offsets.get(node);
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
