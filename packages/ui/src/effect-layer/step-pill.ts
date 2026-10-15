import { type Spring, springPush, stepSpring, still } from "./step-spring.ts";

/**
 * The selected surface's pill on its springs: where its centre is and half
 * its straight part, in rest radii, where it heads for, and how far it
 * stretches along the track, as a share of its length. Below zero it
 * squashes.
 *
 * @internal
 */
export interface PillMotion {
  readonly x: Spring;
  readonly span: Spring;
  readonly lead: Spring;
  readonly deform: Spring;
}

/** @internal */
export const restingPill = (x: number, span: number): PillMotion => ({
  x: still(x),
  span: still(span),
  lead: still(x),
  deform: still(0),
});

/**
 * How the pill moves, in seconds, CSS px and radians per second.
 *
 * The pill heads for a point that eases towards its goal on a spring that
 * does not overshoot, so no move starts at full push, and it follows that
 * point on a spring that overshoots a little and settles. Before a move it
 * winds up: for `seconds`, it heads `depth` px away from where it goes and
 * squashes by `crouch`, and then it launches from there. A press with the
 * pointer has the long wind-up, and a key the short one. On its way it
 * stretches with its speed, and where it first passes its goal it takes a
 * knock that squashes it. The stretch has a spring of its own that
 * overshoots more, so the pill wobbles a little once it lands. It lands
 * once it is nearer to its goal than `land` px, or once it passes it.
 *
 * @internal
 */
export const PILL_MOTION = {
  lead: { omega: 60, zeta: 1 },
  follow: { omega: 44, zeta: 0.62 },
  windUp: {
    seconds: { pointer: 0.065, key: 0.035 },
    depth: { pill: 4, thumb: 3 },
    crouch: -0.04,
  },
  deform: { omega: 45, zeta: 0.45 },
  /** The stretch at full speed, and the speed at which it is about three quarters of that. */
  stretch: { most: 0.05, speed: 700 },
  /** The knock where the pill passes its goal, per second of the deform's speed, at full speed and at the speed at which it is about three quarters of that. */
  knock: { most: 3, speed: 150 },
  land: 1.5,
  /** The stretch is never more than this, and the squash never more than `squash`. */
  most: 0.09,
  squash: 0.07,
} as const;

/**
 * What one step of the pill reads: its goal and its span, in rest radii,
 * the squash it holds, and which way its move goes, 1 along the track.
 */
interface PillGoal {
  readonly goal: number;
  readonly span: number;
  readonly crouch: number;
  readonly heading: 1 | -1;
}

/**
 * Moves the pill `delta` seconds on. Returns its motion, its push along
 * the track in px per second squared, how far it stretches along the
 * track and across it, and whether it is at its goal: nearer to it than
 * `PILL_MOTION.land` px, or past it on this step.
 *
 * @internal
 */
export function stepPill(
  previous: PillMotion,
  input: PillGoal,
  delta: number,
  radius: number,
) {
  const { lead: ease, follow, deform: wobble, stretch, knock } = PILL_MOTION;
  const lead = stepSpring(
    previous.lead,
    input.goal,
    delta,
    ease.omega,
    ease.zeta,
  );
  const x = stepSpring(
    previous.x,
    lead.value,
    delta,
    follow.omega,
    follow.zeta,
  );
  const span = stepSpring(
    previous.span,
    input.span,
    delta,
    follow.omega,
    follow.zeta,
  );
  const accel =
    springPush(x.value, x.speed, lead.value, follow.omega, follow.zeta) *
    radius;
  const along = input.heading * x.speed * radius;
  const goal = Math.min(
    PILL_MOTION.most,
    Math.max(
      -PILL_MOTION.squash,
      input.crouch +
        stretch.most * Math.tanh(Math.max(0, along) / stretch.speed),
    ),
  );
  let deform = previous.deform;
  const passed =
    Math.sign(previous.x.value - input.goal) !==
      Math.sign(x.value - input.goal) && previous.x.value !== input.goal;
  if (passed) {
    const closing = Math.abs(x.speed - lead.speed) * radius;
    deform = {
      ...deform,
      speed: deform.speed - knock.most * Math.tanh(closing / knock.speed),
    };
  }
  deform = stepSpring(deform, goal, delta, wobble.omega, wobble.zeta);
  return {
    motion: { x, span, lead, deform },
    accel,
    stretch: pillStretch(deform.value),
    arrived:
      passed || Math.abs(x.value - input.goal) * radius < PILL_MOTION.land,
  };
}

/**
 * The pill rests once none of its springs will swing it more than `reach`
 * px from its place, or stretch it by more than `stretch`.
 */
const PILL_REST = { reach: 0.4, stretch: 0.005 } as const;

/**
 * The pill has settled at `goal` with half its straight part `span`, in
 * rest radii, and with the squash `crouch`, as `PILL_REST` tells.
 *
 * @internal
 */
export function pillSettled(
  motion: PillMotion,
  goal: number,
  span: number,
  radius: number,
  crouch = 0,
) {
  const { lead, follow, deform } = PILL_MOTION;
  const { reach, stretch } = PILL_REST;
  const swing = (spring: Spring, to: number, omega: number) =>
    Math.hypot(spring.value - to, spring.speed / omega);
  return (
    swing(motion.x, goal, follow.omega) * radius < reach &&
    swing(motion.lead, goal, lead.omega) * radius < reach &&
    swing(motion.span, span, follow.omega) * radius < reach &&
    swing(motion.deform, crouch, deform.omega) < stretch
  );
}

/**
 * The stretch along the track and across it for a deform: the pill keeps
 * about its area, and grows across it only a little, so it stays inside
 * the track.
 *
 * @internal
 */
export function pillStretch(deform: number): readonly [number, number] {
  const along = 1 + deform;
  return [along, Math.min(1.03, 1 / along)];
}
