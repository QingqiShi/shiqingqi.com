import { createFrameRenderer, type Renderer } from "./create-frame-renderer.ts";
import { registryOf } from "./create-motion-engine.ts";
import {
  endOf,
  internalsOf,
  stateAt,
  type MotionValue,
} from "./create-motion-value.ts";
import { createWaapiRenderer } from "./create-waapi-renderer.ts";
import { writeStyles, type Styles } from "./px.ts";

export interface BindOptions {
  /** The styles at these values. It must be pure, because the engine samples it ahead of time. */
  readonly pose: (...values: number[]) => Styles;
  /** The pose of a motion that started under reduced motion. `pose` when it is left out. */
  readonly reducedPose?: (...values: number[]) => Styles;
  /** Inline styles that stay on while a value moves, and come off at rest, where the pose does not write them. */
  readonly hold?: Styles;
  /**
   * At the end of a motion: `"keep"` leaves the last pose inline, and
   * `"clear"` takes off every style the binding wrote. `"keep"` when it is
   * left out.
   */
  readonly rest?: "keep" | "clear";
  /**
   * `"auto"` plays on Web Animations where the element has them, and else
   * writes once a frame. `"frame"` always writes once a frame, for a pose
   * that the compositor must not run on its own.
   */
  readonly renderer?: "auto" | "frame";
}

export interface Binding {
  /** Stops the motion and takes off every style the binding wrote. */
  unbind(): void;
}

/**
 * The attribute that a bound element has while a motion moves it, so that
 * a test can wait until each motion on the page is at rest.
 *
 * @internal
 */
export const MOVING_ATTRIBUTE = "data-moving";

const movers = new WeakMap<Element, number>();

/** Counts the bindings that move `element` now, as more than one binding can. */
function markMoving(element: Element, isMoving: boolean) {
  const count = (movers.get(element) ?? 0) + (isMoving ? 1 : -1);
  movers.set(element, count);
  element.toggleAttribute(MOVING_ATTRIBUTE, count > 0);
}

/** The properties that move a box without a change to the layout. */
const MOVES = new Set(["transform", "translate", "rotate", "scale"]);

function withoutMoves(styles: Styles): Styles {
  return Object.fromEntries(
    Object.entries(styles).filter(([property]) => !MOVES.has(property)),
  );
}

function listOf(values: MotionValue | readonly MotionValue[]) {
  return "get" in values ? [values] : values;
}

/**
 * Shows `values` on `element` through `pose`. Each new target of a value
 * plans the motion again from the path of each value, and not from the
 * styles on the element.
 */
export function bind(
  element: HTMLElement | SVGElement,
  values: MotionValue | readonly MotionValue[],
  {
    pose,
    reducedPose = pose,
    hold = {},
    rest = "keep",
    renderer: kind = "auto",
  }: BindOptions,
): Binding {
  const list = listOf(values);
  if (list.length === 0) throw new Error("A binding needs a motion value.");
  const planners = list.map(internalsOf);
  const { engine } = planners[0];
  const { loop } = engine;
  const written = new Set<string>();
  let isHeld = false;
  let isMarked = false;

  function write(styles: Styles) {
    writeStyles(element, styles);
    for (const property of Object.keys(styles)) written.add(property);
  }

  function clear() {
    for (const property of written) element.style.removeProperty(property);
    written.clear();
  }

  function setHeld(next: boolean) {
    if (next === isHeld) return;
    isHeld = next;
    for (const [property, style] of Object.entries(hold)) {
      if (next) element.style.setProperty(property, style);
      else if (!written.has(property)) element.style.removeProperty(property);
    }
  }

  function setMarked(next: boolean) {
    if (next === isMarked) return;
    isMarked = next;
    markMoving(element, next);
  }

  const renderer: Renderer =
    kind === "auto" && typeof element.animate === "function"
      ? createWaapiRenderer(element, loop, write)
      : createFrameRenderer(loop, write);

  const plans = () => planners.map((planner) => planner.plan());

  function stylesAt(time: number) {
    const current = plans();
    const show = current.some((plan) => plan.reduced) ? reducedPose : pose;
    return show(...current.map((plan) => stateAt(plan, time).value));
  }

  function play() {
    const now = loop.now();
    const end = Math.max(...plans().map(endOf));
    if (end <= now) {
      renderer.stop();
      write(stylesAt(now));
      setHeld(false);
      setMarked(false);
      return;
    }
    setHeld(true);
    setMarked(true);
    renderer.play(stylesAt, now, end);
  }

  function finish() {
    const now = loop.now();
    if (plans().some((plan) => endOf(plan) > now)) return;
    if (rest === "keep") write(stylesAt(now));
    else clear();
    renderer.stop();
    setHeld(false);
    setMarked(false);
  }

  const isMoving = () => list.some((value) => value.isMoving);
  const unwatch = planners.map((planner) =>
    planner.watch({ plan: play, rest: finish }),
  );

  function unbind() {
    for (const stop of unwatch) stop();
    removeBinding();
    renderer.stop();
    clear();
    setHeld(false);
    setMarked(false);
  }

  let wasPosed = false;
  const removeBinding = registryOf(engine).addBinding({
    suspend() {
      wasPosed = written.size > 0;
      const kept =
        wasPosed || isMoving() ? withoutMoves(stylesAt(loop.now())) : {};
      renderer.stop();
      clear();
      write(kept);
    },
    resume() {
      if (isMoving() || wasPosed) play();
    },
    unbind,
  });
  if (isMoving() || rest === "keep") play();
  return { unbind };
}
