/**
 * The satellite droplet a fast flick throws off the back of the drop, in
 * track space: `x` along the travel like the drop's, `y` from the centre
 * line, both in CSS px, with its velocity in CSS px per second.
 *
 * @internal
 */
export interface LiquidDroplet {
  readonly x: number;
  readonly y: number;
  readonly velocityX: number;
  readonly velocityY: number;
  readonly radius: number;
}

/**
 * The wet trail the drop leaves on the track, from where it set off.
 *
 * @internal
 */
export interface LiquidTrail {
  /** The drop's `x` when it set off. */
  readonly from: number;
  /** How wet it still is, from 1 as the drop moves to 0 once it has dried. */
  readonly wet: number;
}

/**
 * One drop of liquid in a Switch, in track space: `x` is how far its centre
 * is along the travel, in CSS px from the off end.
 *
 * @internal
 */
export interface LiquidDrop {
  readonly x: number;
  /** CSS px per second along the travel. */
  readonly velocity: number;
  /**
   * How elongated it is along the travel: its width is `1 + stretch` times
   * its rest diameter and its height `1 / (1 + stretch)` times, so above 0 it
   * is stretched and below 0 squashed, a little, against the end of the
   * track.
   */
  readonly stretch: number;
  readonly stretchVelocity: number;
  readonly droplet: LiquidDroplet | null;
  readonly trail: LiquidTrail | null;
  /** How far the drop has lifted under the pointer, from 0 to 1. */
  readonly lift: number;
  /** Nothing moves any more, so no frame needs to follow. */
  readonly settled: boolean;
}

/**
 * What one step of a drop reads from its Switch and the pointer.
 *
 * @internal
 */
export interface LiquidThumbInput {
  /** Where the thumb rests, in CSS px along the travel. */
  readonly target: number;
  /** Where a drag holds the thumb, in CSS px along the travel, or `null`. */
  readonly drag: number | null;
  /** How far the thumb can travel, in CSS px. */
  readonly travel: number;
  /** The thumb's rest radius, in CSS px. */
  readonly radius: number;
  /** Half the track's height inside its padding, in CSS px. */
  readonly room: number;
  /** The pointer presses the drop, so it flattens a little. */
  readonly pressed: boolean;
  /** The pointer hovers or holds the drop, so it lifts and casts a shadow. */
  readonly lifted: boolean;
  /**
   * How fast the pointer moved as a drag ended this step, in CSS px per
   * second, or 0 at any other step.
   */
  readonly releaseSpeed: number;
  readonly reducedMotion: boolean;
}

interface Spring {
  readonly frequency: number;
  readonly damping: number;
}

const spring = (hertz: number, damping: number): Spring => ({
  frequency: 2 * Math.PI * hertz,
  damping,
});

/** A toggle crosses in about a sixth of a second and overshoots a little. */
const TOGGLE = spring(2.4, 0.5);
/** A drag is followed closely, with no overshoot, and a lag that stretches. */
const DRAG = spring(5, 1);
/** Surface tension: the wobble of a drop that has been deformed. */
const TENSION = spring(4.5, 0.18);
/** How fast the drop lifts under the pointer, per second. */
const LIFT_RATE = 14;

const STEP = 1 / 240;
/** The most a moving drop stretches, and the speed that gives most of it. */
const MAX_STRETCH = 0.28;
const STRETCH_SPEED = 260;
/** How much the drop flattens out under a press. */
const PRESS_FLATTEN = 0.1;
/**
 * The most the drop squashes: it has only the track's padding to grow into
 * across the travel.
 */
const MAX_SQUASH = -0.08;
/** How much of the speed lost against the end of the track squashes it. */
const SPLAT = 0.012;
/** The pointer speed, in CSS px per second, at which a release is a flick. */
const FLICK_SPEED = 500;
const DROPLET_RADIUS = 0.28;
/** How much of the drop's speed the droplet keeps as it pinches off. */
const DROPLET_LAG = 0.12;
/** The upward kick that makes the droplet arc, in CSS px per second. */
const DROPLET_KICK = -90;
const GRAVITY = 500;
/** Cohesion: the pull of the drop on its droplet, per second squared and per second. */
const COHESION = 110;
const COHESION_DAMPING = 6;
/** The droplet merges back once its centre is this close, in rest radii. */
const MERGE_DISTANCE = 0.8;
/** The merge's kick to the stretch, per CSS px per second of closing speed. */
const MERGE_KICK = 0.003;
/** Below this speed the drop has stopped and its trail starts to dry. */
const STOPPED_SPEED = 40;
/** Seconds for a trail to dry. */
const TRAIL_DRY = 0.45;
const SETTLED_DISTANCE = 0.02;
const SETTLED_SPEED = 0.5;
const SETTLED_STRETCH = 0.003;
const SETTLED_STRETCH_SPEED = 0.05;
const SETTLED_LIFT = 0.002;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/**
 * A drop at rest at `x`.
 *
 * @internal
 */
export function restingDrop(x: number): LiquidDrop {
  return {
    x,
    velocity: 0,
    stretch: 0,
    stretchVelocity: 0,
    droplet: null,
    trail: null,
    lift: 0,
    settled: true,
  };
}

/** One sub-step of a damped spring on `value` towards `target`. */
function springStep(
  { frequency, damping }: Spring,
  value: number,
  velocity: number,
  target: number,
  seconds: number,
) {
  const next =
    velocity +
    (-frequency * frequency * (value - target) -
      2 * damping * frequency * velocity) *
      seconds;
  return { value: value + next * seconds, velocity: next };
}

/**
 * How much a drop moving at `speed` stretches along its travel: nothing at
 * rest, and most of `MAX_STRETCH` from `STRETCH_SPEED` up.
 *
 * @internal
 */
export function stretchAtSpeed(speed: number) {
  return MAX_STRETCH * (1 - Math.exp(-Math.abs(speed) / STRETCH_SPEED));
}

/**
 * Whether a drag that ended at `speed` throws a droplet off the drop.
 *
 * @internal
 */
export function isFlick(speed: number) {
  return Math.abs(speed) >= FLICK_SPEED;
}

/**
 * The droplet a flick pinches off the back of a drop moving at `velocity`.
 *
 * @internal
 */
export function pinchOff(drop: LiquidDrop, radius: number): LiquidDroplet {
  const behind = drop.velocity >= 0 ? -1 : 1;
  return {
    x: drop.x + behind * radius * (1 + Math.max(drop.stretch, 0)),
    y: 0,
    velocityX: drop.velocity * DROPLET_LAG,
    velocityY: DROPLET_KICK,
    radius: radius * DROPLET_RADIUS,
  };
}

/** The drop's velocity one sub-step on, the droplet along with it, or merged. */
function stepDroplet(
  droplet: LiquidDroplet,
  drop: { x: number; stretchVelocity: number },
  { radius, room, travel }: LiquidThumbInput,
  seconds: number,
) {
  const pullX = drop.x - droplet.x;
  const pullY = -droplet.y;
  const velocityX =
    droplet.velocityX +
    (COHESION * pullX - COHESION_DAMPING * droplet.velocityX) * seconds;
  const velocityY =
    droplet.velocityY +
    (GRAVITY + COHESION * pullY - COHESION_DAMPING * droplet.velocityY) *
      seconds;
  const reach = room - droplet.radius;
  const freeX = droplet.x + velocityX * seconds;
  const freeY = droplet.y + velocityY * seconds;
  const x = clamp(freeX, 0, travel);
  const y = clamp(freeY, -reach, reach);
  if (Math.hypot(drop.x - x, y) < radius * MERGE_DISTANCE) {
    const closing = Math.hypot(velocityX, velocityY);
    return {
      droplet: null,
      stretchVelocity: drop.stretchVelocity + closing * MERGE_KICK,
    };
  }
  return {
    droplet: {
      x,
      y,
      // Against the track's edge, the droplet stops.
      velocityX: x === freeX ? velocityX : 0,
      velocityY: y === freeY ? velocityY : 0,
      radius: droplet.radius,
    },
    stretchVelocity: drop.stretchVelocity,
  };
}

/**
 * Moves a drop on for `seconds`: along its travel on a spring towards the
 * drag or the rest position, with its surface tension working on its
 * stretch, its droplet and its trail. A drop that runs into the end of the
 * track loses its speed into a squash. Under reduced motion it goes straight
 * to its place and holds its shape.
 *
 * @internal
 */
export function stepLiquidThumb(
  drop: LiquidDrop,
  input: LiquidThumbInput,
  seconds: number,
): LiquidDrop {
  const { target, drag, travel, radius, pressed, lifted } = input;
  const goal = clamp(drag ?? target, 0, travel);
  if (input.reducedMotion) {
    const lift = lifted ? 1 : 0;
    return {
      ...restingDrop(goal),
      lift,
      settled: true,
    };
  }

  let { x, velocity, stretch, stretchVelocity, droplet, trail, lift } = drop;
  if (droplet === null && drag === null && isFlick(input.releaseSpeed)) {
    droplet = pinchOff(drop, radius);
  }
  if (trail === null && drop.settled && Math.abs(goal - x) > SETTLED_DISTANCE) {
    trail = { from: x, wet: 1 };
  }

  const steps = Math.max(1, Math.ceil(seconds / STEP));
  const step = seconds / steps;
  for (let index = 0; index < steps; index++) {
    const moved = springStep(
      drag === null ? TOGGLE : DRAG,
      x,
      velocity,
      goal,
      step,
    );
    x = moved.value;
    velocity = moved.velocity;
    // A stretched drop reaches further, so it meets the end of the track
    // sooner, and squashes against it there.
    const margin = Math.min(radius * Math.max(stretch, 0), travel / 2);
    if (x < margin || x > travel - margin) {
      x = clamp(x, margin, travel - margin);
      stretchVelocity -= Math.abs(velocity) * SPLAT;
      velocity = 0;
    }
    const stretchGoal =
      stretchAtSpeed(velocity) + (pressed ? PRESS_FLATTEN : 0);
    const tension = springStep(
      TENSION,
      stretch,
      stretchVelocity,
      stretchGoal,
      step,
    );
    stretch = Math.max(tension.value, MAX_SQUASH);
    stretchVelocity =
      tension.value < MAX_SQUASH
        ? Math.max(tension.velocity, 0)
        : tension.velocity;
    const reach = Math.min(radius * Math.max(stretch, 0), travel / 2);
    x = clamp(x, reach, travel - reach);
    if (droplet !== null) {
      const next = stepDroplet(droplet, { x, stretchVelocity }, input, step);
      droplet = next.droplet;
      stretchVelocity = next.stretchVelocity;
    }
    lift += ((lifted ? 1 : 0) - lift) * (1 - Math.exp(-LIFT_RATE * step));
    if (trail !== null) {
      trail =
        Math.abs(velocity) > STOPPED_SPEED
          ? { from: trail.from, wet: 1 }
          : { from: trail.from, wet: trail.wet - step / TRAIL_DRY };
      if (trail.wet <= 0) {
        trail = null;
      }
    }
  }

  const liftGoal = lifted ? 1 : 0;
  const settled =
    Math.abs(x - goal) < SETTLED_DISTANCE &&
    Math.abs(velocity) < SETTLED_SPEED &&
    Math.abs(stretch) < SETTLED_STRETCH &&
    Math.abs(stretchVelocity) < SETTLED_STRETCH_SPEED &&
    Math.abs(lift - liftGoal) < SETTLED_LIFT &&
    droplet === null &&
    trail === null;
  return settled
    ? { ...restingDrop(goal), lift: liftGoal, settled }
    : { x, velocity, stretch, stretchVelocity, droplet, trail, lift, settled };
}

/**
 * The pull a dragging pointer has on the drop, as the offset of the blob of
 * liquid that reaches for it, from the drop's centre, and that blob's
 * radius. The pointer has no pull from inside the drop, and the blob stays
 * inside the track: `ahead` and `behind` are how far along the travel it
 * may go, `room` how far from the centre line.
 *
 * @internal
 */
export function liquidPull(
  offsetX: number,
  offsetY: number,
  radius: number,
  bounds: {
    readonly ahead: number;
    readonly behind: number;
    readonly room: number;
  },
) {
  const distance = Math.hypot(offsetX, offsetY);
  const grip = clamp((distance - radius * 0.35) / (radius * 0.95), 0, 1);
  const reach = grip * grip * (3 - 2 * grip);
  const blobRadius = radius * (0.55 - 0.2 * reach);
  const scale = reach * Math.min(1, (radius * 1.4) / Math.max(distance, 1e-6));
  const roomY = Math.max(0, bounds.room - blobRadius);
  return {
    x: clamp(
      offsetX * scale,
      -(bounds.behind + radius - blobRadius),
      bounds.ahead + radius - blobRadius,
    ),
    y: clamp(offsetY * scale * 0.5, -roomY, roomY),
    radius: blobRadius,
  };
}
