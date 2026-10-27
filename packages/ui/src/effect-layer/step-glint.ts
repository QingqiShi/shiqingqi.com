import { LINGER_SET, mean, type LiquidBody } from "./step-liquid.ts";

/**
 * The speed of the liquid's mass along the track, in rest radii per second,
 * at which the motion lifts the glint by 1 - 1/e: about the speed of a pour
 * to the next segment.
 */
const LIFT_SPEED = 12;
/** Seconds of the lift's time constant once the body is solid. */
const LIFT_SECONDS = 0.25;
/** Below this the lift has gone. */
const LIFT_GONE = 0.02;

/**
 * How much the liquid's last move lifts the glint on its lit edge, from 0 at
 * rest to 1, signed by the way the liquid moved along the track: the next
 * value after `delta` seconds.
 *
 * While the body is water, its lit edge does not show, and the lift keeps the
 * fastest the body has moved along the track. The lift holds while the body
 * sets and the edge comes back, and fades out once the body is solid. Thus
 * the glint shows brighter and slid along the rim as the edge comes back, and
 * it moves only back to its rest place, never from one side to the other.
 * Under reduced motion nothing moves, and there is no lift.
 *
 * @internal
 */
export function stepGlint(
  lift: number,
  body: Pick<LiquidBody, "vx" | "set">,
  delta: number,
  reducedMotion: boolean,
) {
  if (reducedMotion) {
    return 0;
  }
  if (body.set <= LINGER_SET) {
    const flow = mean(body.vx);
    const reach =
      Math.sign(flow) * (1 - Math.exp(-Math.abs(flow) / LIFT_SPEED));
    return Math.abs(reach) > Math.abs(lift) ? reach : lift;
  }
  if (body.set < 1) {
    return lift;
  }
  const faded = lift * Math.exp(-delta / LIFT_SECONDS);
  return Math.abs(faded) < LIFT_GONE ? 0 : faded;
}
