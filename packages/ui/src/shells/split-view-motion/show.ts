import { bind, type Binding } from "../../motion/bind.ts";
import type { MotionEngine } from "../../motion/create-motion-engine.ts";
import {
  createMotionValue,
  type MotionValue,
} from "../../motion/create-motion-value.ts";
import { unit } from "../../motion/mix.ts";
import type { Styles } from "../../motion/px.ts";
import { springOf, type SpringRole } from "../../motion/spring-roles.ts";
import type { Part, SplitViewMarkElement } from "./types.ts";

/**
 * How long a cross-fade takes, in seconds, under reduced motion and where a column only changes.
 *
 * @internal
 */
export const CROSS_FADE = 0.17;
/** How close to its target, in its own units, a value of the motion is at rest. */
const REST = 2e-4;

/** @internal */
export function edgeOf(element: HTMLElement) {
  return element.querySelector<HTMLElement>(":scope > [data-split-view-edge]");
}

/**
 * The opacity of a soft edge shadow while its column moves.
 *
 * @internal
 */
export function edgeOpacity(progress: number) {
  return Math.min(1, Math.sin(Math.PI * unit(progress)) * 1.4).toFixed(3);
}

/**
 * A value of the motion that springs as `role`.
 *
 * @internal
 */
export function springValue(
  engine: MotionEngine,
  initial: number,
  role: SpringRole,
) {
  return createMotionValue(engine, initial, {
    spring: springOf(role),
    precision: REST,
  });
}

/**
 * Shows `values` on `element` through `pose`, with `hold` on while they move.
 *
 * @internal
 */
export function show(
  element: SplitViewMarkElement,
  values: MotionValue | readonly MotionValue[],
  pose: (...values: number[]) => Styles,
  hold?: Styles,
): Binding {
  return bind(element, values, { pose, hold });
}

/** @internal */
export function unbindAll(bindings: readonly Binding[]) {
  for (const binding of bindings) binding.unbind();
}

/**
 * Where a part springs, from what moves its `progress`.
 *
 * @internal
 */
export interface Pose {
  readonly element: HTMLElement | null;
  readonly pose: (progress: number) => Styles;
  readonly hold?: Styles;
}

/** @internal */
export function showAll(progress: MotionValue, poses: readonly Pose[]) {
  return poses.flatMap(({ element, pose, hold }) =>
    element === null ? [] : [show(element, progress, pose, hold)],
  );
}

/**
 * Whether `part` still moves. It drops the part that does not.
 *
 * @internal
 */
export function keepMoving(part: Part) {
  if (part.isMoving()) return true;
  part.drop();
  return false;
}
