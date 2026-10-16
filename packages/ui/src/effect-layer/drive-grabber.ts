import type { SheetPose } from "./publish-sheet-pose.ts";
import { PACE } from "./step-liquid.ts";

/**
 * How a grabber's card moved up to the last frame: where it was, in page
 * px, how fast it went and how fast that changed, in px per second and per
 * second squared.
 *
 * @internal
 */
export interface GrabberMotion {
  readonly y: number;
  readonly velocity: number;
  readonly acceleration: number;
}

/**
 * What drives a grabber's liquid this frame: the force on every particle,
 * in rest radii per second squared of the liquid's clock, whether
 * something stirs it, and whether a finger holds it.
 *
 * @internal
 */
export interface LiquidDrive {
  readonly force: readonly [number, number];
  readonly stir: boolean;
  readonly pressed: boolean;
  /**
   * Where the card the grabber sits on ends, as a page y, and the colour
   * past it: the Dim over the page. None while the effect does not know.
   */
  readonly surface?: {
    readonly edge: number;
    readonly above: readonly [number, number, number];
  };
}

/** The liquid feels this share of the card's acceleration. */
const CARRY = 0.05;
/** The most force the drive gives, in rest radii per second squared. */
const FORCE_LIMIT = 70;
/** The pull of the finger, in rest radii per second squared, for each rest radius it is away. */
const FINGER_PULL = 20;
/** Below this force, nothing stirs the liquid. */
const STIR_FORCE = 8;
/** A move this far in one frame, in px, is a jump, not motion. */
const JUMP = 300;
/** Seconds the acceleration takes to follow the card: it smooths a frame's noise. */
const SMOOTHING = 0.03;

const limit = (value: number) => FORCE_LIMIT * Math.tanh(value / FORCE_LIMIT);

/**
 * The drive on a grabber's liquid from where the card is now, `y`, and the
 * pose its Sheet published: the card's acceleration, felt inside the card
 * the other way, and the pull of a finger that holds the card past where
 * it can go. The liquid is `radius` px in rest radius, so the force is in
 * its units. Returns the motion for the next frame with the drive.
 *
 * @internal
 */
export function driveGrabber(
  previous: GrabberMotion | null,
  y: number,
  pose: SheetPose | null,
  delta: number,
  radius: number,
): { motion: GrabberMotion; drive: LiquidDrive } {
  let motion: GrabberMotion;
  if (previous === null || Math.abs(y - previous.y) > JUMP) {
    motion = { y, velocity: 0, acceleration: 0 };
  } else {
    const velocity = (y - previous.y) / delta;
    const raw = (velocity - previous.velocity) / delta;
    const follow = 1 - Math.exp(-delta / SMOOTHING);
    motion = {
      y,
      velocity,
      acceleration:
        previous.acceleration + (raw - previous.acceleration) * follow,
    };
  }
  const pressed = pose !== null && pose.phase === "dragging";
  const finger = pressed ? pose.finger : null;
  const pull = (offset: number) => (FINGER_PULL * offset) / radius;
  const carried = (-motion.acceleration * CARRY) / radius / (PACE * PACE);
  const force: readonly [number, number] = [
    limit(finger === null ? 0 : pull(finger[0])),
    limit(carried + (finger === null ? 0 : pull(finger[1]))),
  ];
  return {
    motion,
    drive: {
      force,
      stir: pressed || Math.hypot(force[0], force[1]) > STIR_FORCE,
      pressed,
    },
  };
}
