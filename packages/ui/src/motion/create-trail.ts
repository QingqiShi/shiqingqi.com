import { chainedPath } from "./chained-path.ts";
import {
  createMotionValue,
  internalsOf,
  type MotionValue,
} from "./create-motion-value.ts";
import { shiftedPath } from "./spring-path.ts";
import type { Spring } from "./spring-roles.ts";

/** @internal */
export interface Trail {
  readonly value: MotionValue;
  /** Stops the trail from following its leader. It keeps the motion that it has. */
  release(): void;
}

/**
 * A value that hangs on `leader` by the spring `link`, and trails each motion
 * of the leader from where it is, at its speed. Under reduced motion, it
 * moves in step with the leader.
 *
 * @internal
 */
export function createTrail(leader: MotionValue, link: Spring): Trail {
  const internals = internalsOf(leader);
  const { loop } = internals.engine;
  const value = createMotionValue(internals.engine, leader.get(), {
    spring: link,
    precision: internals.precision,
  });
  const own = internalsOf(value);

  function follow() {
    const now = loop.now();
    const plan = internals.plan();
    const path = shiftedPath(plan.path, now - plan.start);
    if (plan.reduced) {
      own.adopt(path, true);
      return;
    }
    const from = { value: value.get(), velocity: value.getVelocity() };
    own.adopt(chainedPath(link, from, path, own.precision), false);
  }

  follow();
  const release = internals.watch({ plan: follow, rest: () => {} });
  return { value, release };
}
