import { bind, type Binding } from "./bind.ts";
import type { MotionEngine } from "./create-motion-engine.ts";
import { createMotionValue, type MotionValue } from "./create-motion-value.ts";
import { mix, unit } from "./mix.ts";
import { MIN_MOVE } from "./play-layout.ts";
import { px } from "./px.ts";
import { springOf, springRoles, type Spring } from "./spring-roles.ts";

/**
 * The media query of a pointer that can show a hover fill.
 *
 * @internal
 */
export const CAN_HOVER_QUERY = "(hover: hover) and (pointer: fine)";
/**
 * The spring of a hover fill, as it glides and as it fades.
 *
 * @internal
 */
export const HOVER_SPRING = springOf(springRoles.surface);
/**
 * A fill this faint or fainter has no place to glide from.
 *
 * @internal
 */
export const FADED = 0.05;
/** The scale a fill grows in from, where it has no row to come from. */
const GROW_FROM = 0.92;
/** The scale of a fill while a press holds it. */
const PRESSED_SCALE = 0.97;

/** @internal */
export interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * The box of `element` in the coordinates of a fill under `holder`: from the
 * padding box of `holder`, in the px of `holder`.
 *
 * @internal
 */
export function boxIn(holder: HTMLElement, element: Element): Box {
  const origin = holder.getBoundingClientRect();
  const { left, top, width, height } = element.getBoundingClientRect();
  // An ancestor can have a scale, such as a motion or a thumbnail, and the fill
  // is in that scale too. Remove the scale from the measure, or the scale
  // applies two times to the fill. `offsetWidth` is a rounded value and has no
  // scale, so compare it only with a rounded value.
  const scale =
    Math.round(origin.width) === holder.offsetWidth
      ? 1
      : origin.width / holder.offsetWidth;
  return {
    x: (left - origin.left) / scale - holder.clientLeft,
    y: (top - origin.top) / scale - holder.clientTop,
    width: width / scale,
    height: height / scale,
  };
}

/**
 * One element under a list of rows, which springs from row to row, such as
 * the hover fill of a `NavList` or of a Segment track.
 *
 * @internal
 */
export interface Fill {
  readonly element: HTMLElement;
  readonly box: readonly [MotionValue, MotionValue, MotionValue, MotionValue];
  readonly shown: MotionValue;
  readonly size: MotionValue;
  readonly pressed: MotionValue;
  readonly binding: Binding;
  readonly spring: Spring;
}

/**
 * The fill hides through a filter, not through `opacity`. The effect layer
 * measures no element at `opacity: 0`, and a fill that sheds dust or pulls
 * it in must stay measured.
 *
 * @internal
 */
export function createFill(
  engine: MotionEngine,
  element: HTMLElement,
  spring: Spring,
): Fill {
  const length = () =>
    createMotionValue(engine, 0, { spring, precision: MIN_MOVE });
  const box = [length(), length(), length(), length()] as const;
  const shown = createMotionValue(engine, 0, { spring });
  const size = createMotionValue(engine, GROW_FROM, { spring });
  const pressed = createMotionValue(engine, 0, { spring });
  const binding = bind(element, [...box, shown, size, pressed], {
    pose: (x, y, width, height, at, scale, press) => ({
      translate: `${px(x)} ${px(y)}`,
      width: px(Math.max(0, width)),
      height: px(Math.max(0, height)),
      filter: `opacity(${unit(at).toFixed(3)})`,
      scale: (scale * mix(1, PRESSED_SCALE, press)).toFixed(4),
    }),
  });
  return { element, box, shown, size, pressed, binding, spring };
}

/**
 * Puts a fill at `at` shown, at once. It is smaller while it is faint.
 *
 * @internal
 */
export function setShown(fill: Fill, at: number) {
  fill.shown.set(at);
  fill.size.set(mix(GROW_FROM, 1, at));
}

/**
 * Shows a fill, or hides it, and grows it or shrinks it with the fade.
 *
 * @internal
 */
export function showTo(fill: Fill, isShown: boolean) {
  fill.shown.to(isShown ? 1 : 0);
  fill.size.to(isShown ? 1 : GROW_FROM);
}

/** @internal */
export function placeAt(fill: Fill, box: Box) {
  const [x, y, width, height] = fill.box;
  x.set(box.x);
  y.set(box.y);
  width.set(box.width);
  height.set(box.height);
}

/** @internal */
export function springTo(fill: Fill, box: Box) {
  const [x, y, width, height] = fill.box;
  const { spring } = fill;
  x.to(box.x, { spring });
  y.to(box.y, { spring });
  width.to(box.width, { spring });
  height.to(box.height, { spring });
}

/**
 * Keeps a fill on its row while the layout moves the row.
 *
 * @internal
 */
export function follow(fill: Fill, box: Box) {
  const values = fill.box;
  const targets = [box.x, box.y, box.width, box.height];
  if (values.some((value) => value.isMoving)) {
    if (
      values.some(
        (value, index) => Math.abs(value.target - targets[index]) >= MIN_MOVE,
      )
    ) {
      springTo(fill, box);
    }
    return;
  }
  placeAt(fill, box);
}

/**
 * Shows a hover fill at `to`. A fill that shows glides there. With `growsIn`,
 * or from faint, it grows in there.
 *
 * @internal
 */
export function glideTo(fill: Fill, to: Box, growsIn: boolean) {
  if (growsIn || fill.shown.get() <= FADED) {
    placeAt(fill, to);
    setShown(fill, 0);
  } else {
    springTo(fill, to);
  }
  showTo(fill, true);
}
