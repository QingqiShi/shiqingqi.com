import { CRITICAL_BAND, freeMotion, type MotionState } from "./spring-path.ts";
import type { Spring } from "./spring-roles.ts";

/** One axis of a motion: where it is, at what speed, and where it goes. */
interface Leg {
  readonly from: MotionState;
  readonly target: number;
}

/** How far, in the units of a leg, it can go past `bounce` and still fit. */
const TOLERANCE = 0.01;
/** The most damping the search tries. A start speed that it cannot hold to the bounce gets this. */
const MAX_DAMPING = 3;
/** The search for the damping stops when it knows the ratio to this step. */
const DAMPING_STEP = 0.005;

/** The times after the start at which a free spring stops and turns back, from the first. */
function turnsOf(omega: number, zeta: number, x0: number, v0: number) {
  if (Math.abs(zeta - 1) < CRITICAL_BAND) {
    return [v0 / (omega * (v0 + omega * x0))];
  }
  if (zeta < 1) {
    const omegaD = omega * Math.sqrt(1 - zeta * zeta);
    const sineV = (omega * omega * x0 + zeta * omega * v0) / omegaD;
    const phase = ((Math.atan2(v0, sineV) % Math.PI) + Math.PI) % Math.PI;
    return [0, 1, 2].map((turn) => (phase + turn * Math.PI) / omegaD);
  }
  const root = Math.sqrt(zeta * zeta - 1);
  const fast = -omega * (zeta + root);
  const slow = -omega * (zeta - root);
  const slowShare = (v0 - fast * x0) / (slow - fast);
  const fastShare = x0 - slowShare;
  return [Math.log((-fast * fastShare) / (slow * slowShare)) / (slow - fast)];
}

/**
 * How far the spring goes past its target: the first turn on the far side
 * of the target from where the leg sets out.
 */
function overshootOf(spring: Spring, { from, target }: Leg) {
  const omega = (2 * Math.PI) / spring.response;
  const x0 = from.value - target;
  const v0 = from.velocity;
  const side = Math.sign(x0) || Math.sign(v0);
  if (side === 0) return 0;
  const motion = freeMotion(omega, spring.dampingRatio, x0, v0);
  for (const time of turnsOf(omega, spring.dampingRatio, x0, v0)) {
    if (!(time > 0)) continue;
    const { x } = motion(time);
    if (Math.sign(x) === -side) return Math.abs(x);
  }
  return 0;
}

/**
 * The spring for a travel of several legs at once: the spring of `role`,
 * with only as much more damping as keeps each leg within `bounce` past its
 * target.
 *
 * The system spring overshoots by a share of the distance, so a far jump
 * overshoots far. A bounce reads as a size on the screen, not as a share of
 * the distance: a near jump keeps the role's spring and bounce, and a far one
 * keeps the role's response and the same small bounce at the end. Each leg
 * starts from where it is and how fast it moves, so an interrupted travel
 * keeps to the bounce too.
 *
 * @internal
 */
export function boundedBounceSpring(
  role: Spring,
  legs: readonly Leg[],
  bounce: number,
): Spring {
  const fits = (dampingRatio: number) =>
    legs.every(
      (leg) =>
        overshootOf({ ...role, dampingRatio }, leg) <= bounce + TOLERANCE,
    );
  if (fits(role.dampingRatio)) return role;
  if (!fits(MAX_DAMPING)) return { ...role, dampingRatio: MAX_DAMPING };
  let low = role.dampingRatio;
  let high = MAX_DAMPING;
  while (high - low > DAMPING_STEP) {
    const middle = (low + high) / 2;
    if (fits(middle)) high = middle;
    else low = middle;
  }
  return { ...role, dampingRatio: high };
}
