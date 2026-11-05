import {
  springPath,
  type MotionPath,
  type MotionState,
} from "./spring-path.ts";
import type { Spring } from "./spring-roles.ts";

/** The longest step of the solver, in seconds: four steps in each sample of a renderer. */
const MAX_STEP = 1 / 480;

/**
 * The path of a value that hangs on `leader` by the spring `link`, from
 * `from`: the link pulls it toward where the leader is at each time, so it
 * trails the leader. While the leader moves, a solver steps the motion. When
 * the leader is at rest, the exact path of `link` takes the value to the
 * leader's target. It is at rest no further than `precision` from it.
 *
 * @internal
 */
export function chainedPath(
  link: Spring,
  from: MotionState,
  leader: MotionPath,
  precision: number,
): MotionPath {
  const lead = leader.settleTime;
  if (!(lead > 0)) return springPath(link, from, leader.target, precision);
  const omega = (2 * Math.PI) / link.response;
  const stiffness = omega * omega;
  const friction = 2 * link.dampingRatio * omega;
  const accelerationAt = (pulled: number, value: number, velocity: number) =>
    stiffness * (pulled - value) - friction * velocity;

  const steps = Math.ceil(lead / MAX_STEP);
  const step = lead / steps;
  const values = new Float64Array(steps + 1);
  const velocities = new Float64Array(steps + 1);
  let x = from.value;
  let v = from.velocity;
  values[0] = x;
  velocities[0] = v;
  let pulledAtStart = leader.at(0).value;
  for (let index = 0; index < steps; index++) {
    const time = index * step;
    const pulledAtHalf = leader.at(time + step / 2).value;
    const pulledAtEnd = leader.at(time + step).value;
    const a1 = accelerationAt(pulledAtStart, x, v);
    const x2 = x + (v * step) / 2;
    const v2 = v + (a1 * step) / 2;
    const a2 = accelerationAt(pulledAtHalf, x2, v2);
    const x3 = x + (v2 * step) / 2;
    const v3 = v + (a2 * step) / 2;
    const a3 = accelerationAt(pulledAtHalf, x3, v3);
    const x4 = x + v3 * step;
    const v4 = v + a3 * step;
    const a4 = accelerationAt(pulledAtEnd, x4, v4);
    pulledAtStart = pulledAtEnd;
    x += ((v + 2 * v2 + 2 * v3 + v4) * step) / 6;
    v += ((a1 + 2 * a2 + 2 * a3 + a4) * step) / 6;
    values[index + 1] = x;
    velocities[index + 1] = v;
  }

  const tail = springPath(
    link,
    { value: x, velocity: v },
    leader.target,
    precision,
  );
  const settleTime = lead + tail.settleTime;
  const rest = { value: leader.target, velocity: 0 };
  return {
    settleTime,
    target: leader.target,
    at(seconds) {
      if (seconds >= settleTime) return rest;
      if (seconds <= 0) return from;
      if (seconds >= lead) return tail.at(seconds - lead);
      const index = Math.min(steps - 1, Math.floor(seconds / step));
      const s = seconds / step - index;
      const p0 = values[index];
      const p1 = values[index + 1];
      const m0 = velocities[index] * step;
      const m1 = velocities[index + 1] * step;
      const s2 = s * s;
      const s3 = s2 * s;
      return {
        value:
          (2 * s3 - 3 * s2 + 1) * p0 +
          (s3 - 2 * s2 + s) * m0 +
          (-2 * s3 + 3 * s2) * p1 +
          (s3 - s2) * m1,
        velocity:
          ((6 * s2 - 6 * s) * p0 +
            (3 * s2 - 4 * s + 1) * m0 +
            (-6 * s2 + 6 * s) * p1 +
            (3 * s2 - 2 * s) * m1) /
          step,
      };
    },
  };
}
