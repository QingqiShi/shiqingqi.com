/**
 * The particles of a liquid and the walls that hold them: what a step
 * moves. In production the compute shader of `liquidSimulation` keeps
 * them on the GPU, and `simulateLiquid` runs the same physics on the CPU.
 *
 * @internal
 */
export interface LiquidParticles {
  readonly x: Float32Array;
  readonly y: Float32Array;
  /** Units of the rest radius per second. */
  readonly vx: Float32Array;
  readonly vy: Float32Array;
  /** The walls that hold the liquid now, as `LiquidInput` gives them. */
  readonly from: number;
  readonly to: number;
  /** The walls across the track that hold the liquid now, as `LiquidInput` gives them. */
  readonly low: number;
  readonly high: number;
}

/**
 * The liquid of a Switch's thumb or a segmented control's indicator, as a
 * particle fluid in track space: `x` runs along the track from the centre
 * of the first place the liquid can rest, `y` from the centre line, both in
 * units of the rest radius, half the height of the thumb or the indicator,
 * so the same numbers serve every size. The track holds the liquid inside
 * its padding, between two walls: every point within 1 of the segment from
 * `(from, 0)` to `(to, 0)`. At rest the liquid fills a pill, every point
 * within 1 of a segment `2 × span` long, which for a thumb is a circle.
 * Where the rest shape is a box with rounded corners, the segment is a box
 * from `low` to `high` across, and so is the track.
 *
 * The fluid is Clavet, Beaudoin and Poulin's double density relaxation: each
 * step moves the particles, then pushes them apart where they are denser
 * than at rest and pulls them together where they are sparser, with a near
 * density that keeps the surface tight, the way surface tension keeps a
 * drop whole. A toggle tilts the track: a body force pulls every particle
 * towards the target, the liquid pours over, piles against the far end,
 * and sloshes until viscosity has taken its motion.
 *
 * @internal
 */
export interface LiquidBody extends LiquidParticles {
  /**
   * How far the drawn surface has settled into the thumb's circle, from 0
   * while the liquid is on its way to 1 once it has arrived.
   */
  readonly calm: number;
  /**
   * How solid the thumb is, from 0 as clear water to 1 as the control's
   * own solid surface: it melts when it is pressed or starts to move, sets
   * as far as `LINGER_SET` once it arrives, and sets all the way at the
   * end of the time it settles in.
   */
  readonly set: number;
  /** Nothing moves any more, so no frame needs to follow for the body. */
  readonly settled: boolean;
  /**
   * The reach of each particle, against its reach in a thumb's liquid. The
   * body has a fixed number of particles, so it spreads them further apart
   * to fill a larger pill, and moves this to the target's as it pours.
   */
  readonly scale: number;
  readonly beads: readonly LiquidBead[];
  /** Where the trailing edge last shed a bead. */
  readonly shedAt: number;
  readonly seed: number;
}

/**
 * A bead of liquid on the track. It swells out of the trailing edge, where
 * the body draws it on with a neck, until it pinches off. The tilt moves it
 * on towards the target, slower than the body because the track holds it
 * back more, so it falls behind on the way and catches up once the body has
 * landed, and the body absorbs it where it covers it. Until then it
 * evaporates: it shrinks over its life.
 *
 * @internal
 */
export interface LiquidBead {
  readonly x: number;
  readonly y: number;
  /** Along the travel, in units of the rest radius per second. */
  readonly vx: number;
  /** In units of the rest radius, when it is fully out. */
  readonly radius: number;
  readonly age: number;
  readonly life: number;
  /** It has pinched off from the body. */
  readonly free: boolean;
}

/**
 * What one step reads from the Switch or the segmented control.
 *
 * @internal
 */
export interface LiquidInput {
  /** Where the liquid is pulled to: the centre of its rest shape. */
  readonly target: number;
  /**
   * Half the length of the straight part of the rest shape: 0 for a
   * thumb's circle, more for an indicator's pill.
   */
  readonly span: number;
  /**
   * The walls the liquid lands on: the centres of the end caps of the room
   * it has. A Switch's are the ends of its track. A segmented control puts
   * the wall ahead of the liquid at the far end of the target's pill, so
   * the liquid lands there. A wall that moves in stops at the liquid and
   * follows it in, so it never pushes the liquid.
   */
  readonly from: number;
  readonly to: number;
  /**
   * The straight part of the rest shape across the track, from `low` to
   * `high` on `y`, which is also the room the track has across: 0 and 0
   * for a pill. A box with rounded corners, such as a row of a list, has a
   * straight part on both axes. A wall across that moves in follows the
   * liquid in, as `from` and `to` do.
   *
   * @default 0
   */
  readonly low?: number;
  readonly high?: number;
  /** A pointer is down on the control, so the liquid stays melted. */
  readonly pressed: boolean;
  readonly reducedMotion: boolean;
  /**
   * Where the press that sent the liquid was across the track, from -1 at
   * its top to 1 at its bottom. While the liquid pours, the track also tilts
   * a little across towards it, so the liquid lands higher or lower on the
   * far end. A toggle with no press point aims at 0, the centre line.
   */
  readonly aim: number;
}

/**
 * The particles of a thumb's liquid. A longer pill has more, in proportion
 * to its area, up to `MAX_PARTICLE_COUNT`.
 *
 * @internal
 */
export const PARTICLE_COUNT = 150;
/**
 * The most particles a body has. Past this a longer pill spreads them
 * further apart instead, so that a step costs at most about as much as
 * two thumbs.
 *
 * @internal
 */
export const MAX_PARTICLE_COUNT = 225;

/**
 * The reach of a particle's density, in units of the rest radius. The
 * drawn surface uses the same reach, so that the surface it finds matches
 * the rest circle.
 *
 * @internal
 */
export const KERNEL_REACH = 0.42;

/** The disk the particles fill at rest, inside the wall by one particle. */
const PARTICLE_SPACING = Math.sqrt(Math.PI / PARTICLE_COUNT) * 0.93;
/** @internal */
export const PARTICLE_RADIUS = PARTICLE_SPACING / 2;
/** A low-discrepancy sequence in two dimensions, which fills a box evenly. */
const PLASTIC = [0.7548776662466927, 0.5698402909980532] as const;
const SUBSTEP = 1 / 240;
/**
 * The longest frame the liquid keeps up with. At 30 Hz, as in iOS Low Power
 * Mode, a frame can take twice its interval, and the liquid must not slow
 * down then.
 */
const MAX_STEP = 1 / 15;
/**
 * A particle moves at most this far, in rest radii, in one substep: a
 * boosted pour takes more substeps, so that the relaxation stays stable.
 * A Switch's particles never move more than 0.06 in a substep.
 */
const SUBSTEP_MOVE = 0.08;
/**
 * The most substeps one step takes, which bounds a frame's work on the GPU:
 * a frame's step is at most `MAX_STEP`, so this is reached only by a body
 * that moves faster than any pour does. A pour across a wide track moves
 * at most about 75 rest radii per second.
 *
 * @internal
 */
export const MAX_SUBSTEPS = 96;
/**
 * The liquid's clock runs this many times faster than the page's: every
 * rate here is per second of the liquid's clock, so the whole pour, its
 * beads and its setting speed up together and the physics stays the same.
 */
const PACE = 1.5;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** @internal */
export const STIFFNESS = 150;
/** @internal */
export const NEAR_STIFFNESS = 500;
/** @internal */
export const VISCOSITY = 3;
/** @internal */
export const VISCOSITY_QUADRATIC = 0.25;
/**
 * Per second, on every particle: the liquid's loss to the track.
 *
 * @internal
 */
export const DRAG = 2.5;
/**
 * Per second, more loss once the body has come to its target, so that the
 * slosh after it lands dies away over the time it lingers.
 *
 * @internal
 */
export const SETTLE_DRAG = 2.5;
/**
 * The tilt towards the target, in rest radii per second squared.
 *
 * @internal
 */
export const TILT = 56;
/** Within this reach of the target the tilt eases off. */
const TILT_REACH = 0.4;
/**
 * The most the lean's `tanh` is given, in units of `TILT_REACH`. `tanh` is
 * 1 in f32 from 20 on, so this changes no result. Under relaxed math, which
 * is WebKit's default for Metal, a `tanh` that goes through `exp` overflows
 * to inf / inf = NaN from about 44 on, and a wide track reaches that.
 */
const LEAN_LIMIT = 20;
/**
 * Farther from the target than this, the tilt is steeper, by how much
 * farther to the power `TILT_BOOST_POWER` and at most `TILT_BOOST_MAX`
 * times, so that a pour to the next segment lands about when a Switch's
 * does and a pour across several lands not much later: longer than any
 * Switch's travel, which is at most 2.29 rest radii, so a Switch pours as
 * it always has.
 */
const TILT_BOOST_REACH = 2.5;
const TILT_BOOST_POWER = 1.5;
const TILT_BOOST_MAX = 3.25;
/**
 * The tilt across the track at a full `aim`, in rest radii per second
 * squared, while the liquid pours. It moves the body only a little across,
 * but enough that it lands well off the middle of the far end.
 *
 * @internal
 */
export const AIM_TILT = 6;
/**
 * A weak pull to the centre line, so the body sits on it at rest.
 *
 * @internal
 */
export const CENTRE_PULL = 4;
/**
 * The liquid wets the wall it touches: per second, how fast a particle
 * within `WALL_GRIP_REACH` of the wall loses its speed, so that the front
 * pins where it lands and the mass behind it sloshes. A pill wets the
 * track's long sides all along its length, where a thumb touches them
 * only at its poles, so the sides share this grip over `SIDE_GRIP_SHARE`
 * times the pill's span: else they drag the pill out into a long slab
 * with a tail.
 *
 * @internal
 */
export const WALL_GRIP = 12;
/** @internal */
export const WALL_GRIP_REACH = 0.08;
/** @internal */
export const SIDE_GRIP_SHARE = 8;

/** Below this mean speed, in rest radii per second, the liquid is still. */
const STILL_SPEED = 0.3;
/**
 * The liquid has arrived once the centre of its mass is this near the
 * target, in rest radii, plus this share of the span for a pill, which
 * sloshes further: as it lands on the far end.
 */
const ARRIVE_REACH = 0.2;
const ARRIVE_SPAN = 0.5;
/**
 * Seconds on the page's clock that the liquid takes to settle once it has
 * arrived: until then it flows on, sloshes, and takes its drops back in.
 */
const LINGER = 0.8;
/**
 * Seconds on the page's clock, at the end of `LINGER`, in which the
 * liquid sets solid.
 */
const SET_TIME = 1 / 3;
/**
 * Per second: how fast the liquid that has arrived settles into the rest
 * shape, and how fast it sets.
 */
const SETTLE = 1 / (LINGER * PACE);
const SET = 1 / (SET_TIME * PACE);
/**
 * How far the liquid sets while it lingers: its core is solid, and its rim
 * is water.
 *
 * @internal
 */
export const LINGER_SET = 0.4;
const CALM_FALL = 16;
/** Per second: how fast the thumb thaws into water. */
const MELT = 6;

/**
 * The trailing edge sheds at most one bead each time it moves this far, or
 * a `SHED_BUDGET` share of the room between the walls if that is more, so
 * that a long pour leaves beads along its way and not a row of them. The
 * room of a Switch is at most 2.29, so its spacing is always this.
 */
const SHED_SPACING = 0.233;
const SHED_BUDGET = 10.8;
const SHED_CHANCE = 0.9;
/** The trailing edge sheds only when it moves faster than this. */
const SHED_SPEED = 1;
/**
 * The body sheds nothing within this reach of its target, so that a bead it
 * sheds as it lands does not join the beads behind it to the body.
 */
const SHED_REACH = 0.7;
const BEAD_RADIUS = { min: 0.22, max: 0.38 } as const;
const BEAD_LIFE = { min: 1.6, max: 3 } as const;
const MAX_BEADS = 16;
/** Seconds a bead takes to swell out of the trailing edge. */
const BEAD_GROW = 0.04;
/** A bead leaves with this share of the body's speed. */
const BEAD_CARRY = 0.12;
/**
 * The track holds a bead back by this much, in rest radii per second
 * squared, against the tilt's `TILT`: much more than it holds the body, so
 * that a bead falls behind the body but keeps moving on.
 */
const BEAD_FRICTION = 40;
/**
 * How far the liquid's surface reaches for a bead, as a multiple of the
 * bead's radius: the body and the bead join with a neck while the gap
 * between them is less than half of it.
 *
 * @internal
 */
export const NECK_REACH = 1.6;
/** Per second: how fast the body absorbs a bead whose centre it covers. */
const ABSORB = 20;
/** A bead this small has gone, in rest radii. */
const GONE_RADIUS = 0.02;
/** Per second: how fast the body spreads or gathers to fill a new pill. */
const SCALE_RATE = 8;

function between(unit: number, range: { min: number; max: number }) {
  return range.min + (range.max - range.min) * unit;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/**
 * The mean of the values: of a body's `x` or `y`, the centre of the
 * liquid's mass along or across the track.
 *
 * @internal
 */
export function mean(values: ArrayLike<number>) {
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
  }
  return sum / values.length;
}

/**
 * The area of a pill of radius 1 with a straight part `2 × span` long, or
 * of a box with corners of radius 1 that is also `2 × girth` longer across.
 */
function pillArea(span: number, girth: number) {
  const along = Math.max(0, span);
  const across = Math.max(0, girth);
  return Math.PI + 4 * along + 4 * across + 4 * along * across;
}

/**
 * How many particles the liquid of a pill of `span` has: a thumb's count
 * for a circle, and more in proportion to the area, up to
 * `MAX_PARTICLE_COUNT`.
 *
 * @internal
 */
export function particleCountFor(span: number, girth = 0) {
  return Math.min(
    MAX_PARTICLE_COUNT,
    Math.max(
      PARTICLE_COUNT,
      Math.round((PARTICLE_COUNT * pillArea(span, girth)) / Math.PI),
    ),
  );
}

/**
 * The reach of each of `count` particles that fill a pill of `span`,
 * against the reach of a thumb's: 1 for a thumb.
 *
 * @internal
 */
export function scaleFor(span: number, count: number, girth = 0) {
  return Math.sqrt(
    (pillArea(span, girth) / Math.PI) * (PARTICLE_COUNT / count),
  );
}

/** The density at the centre of a thumb's rest disk. */
function restDensity() {
  const [x, y] = restPositions(0, 0, PARTICLE_COUNT, 1);
  let density = 0;
  for (let j = 0; j < PARTICLE_COUNT; j++) {
    const distance = Math.hypot(x[j], y[j]);
    if (distance < KERNEL_REACH) {
      const q = 1 - distance / KERNEL_REACH;
      density += q * q;
    }
  }
  return density;
}

/**
 * The particles laid out evenly over the rest pill, centred at `centre`:
 * a disk split into two halves at the ends, and a box between them. A rest
 * shape with a straight part across, from `low` to `high`, splits the disk
 * into its four corners, and has a second box between the corners at each
 * end.
 */
function restPositions(
  centre: number,
  span: number,
  count: number,
  scale: number,
  low = 0,
  high = 0,
): [Float32Array, Float32Array] {
  const x = new Float32Array(count);
  const y = new Float32Array(count);
  const radius = 1 - PARTICLE_RADIUS * scale;
  const girth = (high - low) / 2;
  const middle = (low + high) / 2;
  const disk = Math.PI * radius * radius;
  const box = 4 * span * (radius + girth);
  const ends = 4 * girth * radius;
  const all = disk + box + ends;
  const inBox = span > 0 ? Math.round((count * box) / all) : 0;
  const inEnds = girth > 0 ? Math.round((count * ends) / all) : 0;
  const inDisk = count - inBox - inEnds;
  for (let i = 0; i < inDisk; i++) {
    const distance = radius * Math.sqrt((i + 0.5) / inDisk);
    const angle = i * GOLDEN_ANGLE;
    const along = distance * Math.cos(angle);
    const across = distance * Math.sin(angle);
    x[i] = centre + along + Math.sign(along) * span;
    y[i] = girth > 0 ? middle + across + Math.sign(across) * girth : across;
  }
  for (let i = 0; i < inBox; i++) {
    const u = (0.5 + (i + 1) * PLASTIC[0]) % 1;
    const v = (0.5 + (i + 1) * PLASTIC[1]) % 1;
    x[inDisk + i] = centre + (2 * u - 1) * span;
    y[inDisk + i] = middle + (2 * v - 1) * (radius + girth);
  }
  for (let i = 0; i < inEnds; i++) {
    const u = (0.5 + (i + 1) * PLASTIC[0]) % 1;
    const v = (0.5 + (i + 1) * PLASTIC[1]) % 1;
    const along = (2 * u - 1) * radius;
    x[inDisk + inBox + i] = centre + along + Math.sign(along) * span;
    y[inDisk + inBox + i] = middle + (2 * v - 1) * girth;
  }
  return [x, y];
}

/** @internal */
export const REST_DENSITY = restDensity();

/**
 * How far a frame of `delta` seconds moves the liquid's clock, in seconds
 * of that clock.
 *
 * @internal
 */
export function liquidStep(delta: number) {
  return Math.min(delta, MAX_STEP) * PACE;
}

/**
 * How many substeps a step of `step` seconds takes for a body whose
 * fastest particle moves at `fastest` rest radii per second.
 *
 * @internal
 */
export function substepCount(step: number, fastest: number) {
  "use gpu";
  return Math.min(
    MAX_SUBSTEPS,
    Math.max(
      1,
      Math.ceil(step / SUBSTEP),
      Math.ceil((step * fastest) / SUBSTEP_MOVE),
    ),
  );
}

/**
 * The liquid at rest at `target`: a circle, or a pill of `span`, between
 * the walls `from` and `to`, which are the ends of the pill unless given.
 * `count` keeps the particles of a body that rests again.
 *
 * @internal
 */
export function restingLiquid(
  target: number,
  {
    seed = 1,
    span = 0,
    low = 0,
    high = 0,
    count = particleCountFor(span, (high - low) / 2),
    from = target - span,
    to = target + span,
  }: {
    seed?: number;
    span?: number;
    low?: number;
    high?: number;
    count?: number;
    from?: number;
    to?: number;
  } = {},
): LiquidBody {
  const scale = scaleFor(span, count, (high - low) / 2);
  const [x, y] = restPositions(target, span, count, scale, low, high);
  return {
    x,
    y,
    vx: new Float32Array(count),
    vy: new Float32Array(count),
    calm: 1,
    set: 1,
    settled: true,
    scale,
    from,
    to,
    low,
    high,
    beads: [],
    shedAt: target,
    seed,
  };
}

/** The particles this near the wall of an end count as where the liquid meets it. */
const IMPACT_BAND = 0.15;

/**
 * Where the liquid lands on the wall at `end`, which the liquid pours
 * towards in `direction` (1 along the track, -1 back), or `null` while it
 * does not touch that wall: the middle of the particles that meet the wall
 * there, pushed out onto the wall. Liquid past the wall, which a wall that
 * has moved in behind it leaves, does not touch it.
 *
 * @internal
 */
export function impactOn(body: LiquidBody, end: number, direction: 1 | -1 = 1) {
  const limit = 1 - PARTICLE_RADIUS * body.scale - 0.03;
  let touches = false;
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < body.x.length; i++) {
    const dx = (body.x[i] - end) * direction;
    if (dx <= 0) {
      continue;
    }
    const distance = Math.hypot(dx, body.y[i]);
    if (distance > limit + IMPACT_BAND) {
      continue;
    }
    touches ||= distance >= limit;
    if (distance >= limit - IMPACT_BAND) {
      sumX += dx;
      sumY += body.y[i];
    }
  }
  if (!touches) {
    return null;
  }
  const length = Math.hypot(sumX, sumY);
  return { x: end + (direction * sumX) / length, y: sumY / length };
}

interface Walls {
  readonly from: number;
  readonly to: number;
  readonly low: number;
  readonly high: number;
}

/**
 * How far a particle of `radius` at `(x, y)` is from the wall of a track
 * that holds the liquid between `from` and `to`, and across between `low`
 * and `high`.
 *
 * @internal
 */
export function wallGap(
  x: number,
  y: number,
  radius: number,
  from: number,
  to: number,
  low: number,
  high: number,
) {
  "use gpu";
  const outside = x - Math.min(to, Math.max(from, x));
  const beside = y - Math.min(high, Math.max(low, y));
  return 1 - radius - Math.sqrt(outside * outside + beside * beside);
}

/** The nearest point to `(x, y)` that a disk of `radius` fits in the track. */
function insideTrack(
  x: number,
  y: number,
  radius: number,
  { from, to, low, high }: Walls,
) {
  const nearX = clamp(x, from, to);
  const nearY = clamp(y, low, high);
  const dx = x - nearX;
  const dy = y - nearY;
  const distance = Math.hypot(dx, dy);
  const limit = 1 - radius;
  if (distance <= limit) {
    return { x, y };
  }
  const scale = limit / distance;
  return { x: nearX + dx * scale, y: nearY + dy * scale };
}

/**
 * The walls for this step: the input's, but a wall that moves in stops
 * where it would push a particle, and moves in only as the liquid leaves.
 */
function wallsFor(
  body: LiquidParticles,
  input: LiquidInput,
  scale: number,
): Walls {
  const reach = 1 - PARTICLE_RADIUS * scale;
  let leftmost = Number.POSITIVE_INFINITY;
  let rightmost = Number.NEGATIVE_INFINITY;
  let lowest = Number.POSITIVE_INFINITY;
  let highest = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < body.x.length; i++) {
    const x = body.x[i];
    const y = body.y[i];
    const beside = y - clamp(y, body.low, body.high);
    const outside = x - clamp(x, body.from, body.to);
    const across = Math.sqrt(Math.max(0, reach * reach - beside ** 2));
    const along = Math.sqrt(Math.max(0, reach * reach - outside ** 2));
    leftmost = Math.min(leftmost, x + across);
    rightmost = Math.max(rightmost, x - across);
    lowest = Math.min(lowest, y + along);
    highest = Math.max(highest, y - along);
  }
  const low = input.low ?? 0;
  const high = input.high ?? 0;
  return {
    from: input.from <= body.from ? input.from : Math.min(input.from, leftmost),
    to: input.to >= body.to ? input.to : Math.max(input.to, rightmost),
    low: low <= body.low ? low : Math.min(low, lowest),
    high: high >= body.high ? high : Math.max(high, highest),
  };
}

const density = new Float32Array(MAX_PARTICLE_COUNT);
const nearDensity = new Float32Array(MAX_PARTICLE_COUNT);
const previousX = new Float32Array(MAX_PARTICLE_COUNT);
const previousY = new Float32Array(MAX_PARTICLE_COUNT);
const pairI = new Int32Array(
  (MAX_PARTICLE_COUNT * (MAX_PARTICLE_COUNT - 1)) / 2,
);
const pairJ = new Int32Array(pairI.length);

/** Lists every pair within `reach`; returns how many. */
function findPairs(x: Float32Array, y: Float32Array, reach: number) {
  let count = 0;
  const reachSquared = reach * reach;
  for (let i = 0; i < x.length; i++) {
    for (let j = i + 1; j < x.length; j++) {
      const dx = x[j] - x[i];
      const dy = y[j] - y[i];
      if (dx * dx + dy * dy < reachSquared) {
        pairI[count] = i;
        pairJ[count] = j;
        count++;
      }
    }
  }
  return count;
}

/**
 * How far the track leans towards a target `away` off: from -1 to 1, flat
 * within `TILT_REACH` of it. The limit keeps `tanh` in the range where the
 * GPU's relaxed maths is finite.
 *
 * @internal
 */
export function leanTo(away: number) {
  "use gpu";
  return Math.tanh(
    Math.min(LEAN_LIMIT, Math.max(-LEAN_LIMIT, away / TILT_REACH)),
  );
}

/**
 * Whether every particle has a finite place and speed: a GPU whose maths
 * overflowed sends NaN back, which no step recovers from.
 *
 * @internal
 */
export function finiteParticles({ x, y, vx, vy }: LiquidParticles) {
  for (const values of [x, y, vx, vy]) {
    for (let i = 0; i < values.length; i++) {
      if (!Number.isFinite(values[i])) {
        return false;
      }
    }
  }
  return true;
}

/**
 * How much steeper the tilt is at `away` from the target: 1 near it, and
 * in proportion to the distance far from it.
 *
 * @internal
 */
export function tiltBoost(away: number) {
  "use gpu";
  return Math.min(
    TILT_BOOST_MAX,
    Math.max(1, Math.abs(away) / TILT_BOOST_REACH) ** TILT_BOOST_POWER,
  );
}

function substep(
  x: Float32Array,
  y: Float32Array,
  vx: Float32Array,
  vy: Float32Array,
  { target, span, aim, low = 0, high = 0 }: LiquidInput,
  walls: Walls,
  scale: number,
  dt: number,
) {
  const count = x.length;
  const reach = KERNEL_REACH * scale;
  const particleRadius = PARTICLE_RADIUS * scale;
  // The particles are `scale` times further apart, so the pressure must
  // move them `scale` times as far for the same flow.
  const stiffness = STIFFNESS * scale;
  const nearStiffness = NEAR_STIFFNESS * scale;
  const quadratic = VISCOSITY_QUADRATIC / scale;
  const wallDamping = Math.exp(-WALL_GRIP * dt);
  const sideDamping = Math.exp(
    (-WALL_GRIP * dt) / (1 + SIDE_GRIP_SHARE * span),
  );
  let centreX = 0;
  let centreY = 0;
  for (let i = 0; i < count; i++) {
    centreX += x[i] / count;
    centreY += y[i] / count;
  }
  // The tilt is one acceleration for the whole body, as gravity is when a
  // container moves: it must not squeeze the body towards the target.
  const lean = leanTo(target - centreX);
  const arrived = 1 - Math.abs(lean);
  const damping = Math.exp(-(DRAG + SETTLE_DRAG * arrived) * dt);
  const tiltX = TILT * tiltBoost(target - centreX) * lean * dt;
  const tiltY =
    (AIM_TILT * aim * Math.abs(lean) -
      CENTRE_PULL * (centreY - (low + high) / 2)) *
    dt;
  for (let i = 0; i < count; i++) {
    vx[i] = (vx[i] + tiltX) * damping;
    vy[i] = (vy[i] + tiltY) * damping;
    if (
      wallGap(
        x[i],
        y[i],
        particleRadius,
        walls.from,
        walls.to,
        walls.low,
        walls.high,
      ) < WALL_GRIP_REACH
    ) {
      const onSide = x[i] > walls.from && x[i] < walls.to;
      vx[i] *= onSide ? sideDamping : wallDamping;
      vy[i] *= onSide ? sideDamping : wallDamping;
    }
  }

  const pairs = findPairs(x, y, reach);
  for (let p = 0; p < pairs; p++) {
    const i = pairI[p];
    const j = pairJ[p];
    const dx = x[j] - x[i];
    const dy = y[j] - y[i];
    const distance = Math.hypot(dx, dy);
    if (distance < 1e-6) {
      continue;
    }
    const ux = dx / distance;
    const uy = dy / distance;
    const inward = (vx[i] - vx[j]) * ux + (vy[i] - vy[j]) * uy;
    if (inward > 0) {
      const q = 1 - distance / reach;
      const impulse =
        dt * q * (VISCOSITY * inward + quadratic * inward * inward);
      const half = Math.min(impulse, inward) / 2;
      vx[i] -= half * ux;
      vy[i] -= half * uy;
      vx[j] += half * ux;
      vy[j] += half * uy;
    }
  }

  previousX.set(x);
  previousY.set(y);
  for (let i = 0; i < count; i++) {
    x[i] += vx[i] * dt;
    y[i] += vy[i] * dt;
  }

  const moved = findPairs(x, y, reach);
  density.fill(0, 0, count);
  nearDensity.fill(0, 0, count);
  for (let p = 0; p < moved; p++) {
    const i = pairI[p];
    const j = pairJ[p];
    const distance = Math.hypot(x[j] - x[i], y[j] - y[i]);
    const q = 1 - distance / reach;
    density[i] += q * q;
    density[j] += q * q;
    nearDensity[i] += q * q * q;
    nearDensity[j] += q * q * q;
  }
  const dtSquared = dt * dt;
  for (let p = 0; p < moved; p++) {
    const i = pairI[p];
    const j = pairJ[p];
    const dx = x[j] - x[i];
    const dy = y[j] - y[i];
    const distance = Math.hypot(dx, dy);
    if (distance < 1e-6) {
      continue;
    }
    const q = 1 - distance / reach;
    const pressure =
      stiffness * (density[i] + density[j] - 2 * REST_DENSITY) * 0.5;
    const nearPressure =
      nearStiffness * (nearDensity[i] + nearDensity[j]) * 0.5;
    const push = (dtSquared * (pressure * q + nearPressure * q * q)) / 2;
    const ux = (dx / distance) * push;
    const uy = (dy / distance) * push;
    x[i] -= ux;
    y[i] -= uy;
    x[j] += ux;
    y[j] += uy;
  }

  for (let i = 0; i < count; i++) {
    const inside = insideTrack(x[i], y[i], particleRadius, walls);
    x[i] = inside.x;
    y[i] = inside.y;
    vx[i] = (x[i] - previousX[i]) / dt;
    vy[i] = (y[i] - previousY[i]) / dt;
  }
}

/**
 * A bead's drawn radius, in rest radii: it swells out of the body and
 * shrinks as it evaporates.
 *
 * @internal
 */
export function beadRadius(bead: LiquidBead) {
  const grown = clamp01(bead.age / BEAD_GROW);
  const swell = grown * grown * (3 - 2 * grown);
  return bead.radius * swell * Math.sqrt(Math.max(0, 1 - bead.age / bead.life));
}

/** How far the nearest particle is from `(x, y)`. */
function nearestParticle(
  body: { x: Float32Array; y: Float32Array },
  x: number,
  y: number,
) {
  let nearest = Number.POSITIVE_INFINITY;
  for (let i = 0; i < body.x.length; i++) {
    nearest = Math.min(nearest, Math.hypot(body.x[i] - x, body.y[i] - y));
  }
  return nearest;
}

/**
 * Moves and ages the beads: the tilt towards `target` moves them on, and
 * the track holds them back. A bead pinches off once the body has drawn
 * away from it, and the body absorbs a bead that has pinched off once it
 * covers its centre: the bead shrinks into it. As the body settles, it
 * absorbs each bead once the bead is all in the rest shape at `target`.
 * Drops the beads that have evaporated or been absorbed.
 */
function moveBeads(
  beads: readonly LiquidBead[],
  body: { x: Float32Array; y: Float32Array },
  delta: number,
  { target, span, low = 0, high = 0 }: LiquidInput,
  walls: Walls,
  scale: number,
  boost: number,
  settling: boolean,
) {
  const kept: LiquidBead[] = [];
  for (const bead of beads) {
    const age = bead.age + delta;
    if (age >= bead.life) {
      continue;
    }
    const tilt = TILT * boost * leanTo(target - bead.x) * delta;
    const held = Math.min(
      BEAD_FRICTION * boost * delta,
      Math.abs(bead.vx + tilt),
    );
    const vx = bead.vx + tilt - Math.sign(bead.vx + tilt) * held;
    const drawn = beadRadius({ ...bead, age });
    const { x, y } = insideTrack(bead.x + vx * delta, bead.y, drawn, walls);
    const nearest = nearestParticle(body, x, y);
    const gap = nearest - PARTICLE_RADIUS * scale - drawn;
    const free =
      bead.free || (age > BEAD_GROW && gap > (NECK_REACH * drawn) / 2);
    const restX = clamp(x, target - span, target + span);
    const restY = clamp(y, low, high);
    const absorbed = settling
      ? Math.hypot(x - restX, y - restY) + drawn < 1
      : free && nearest < PARTICLE_SPACING * scale;
    const radius = absorbed
      ? bead.radius * Math.exp(-ABSORB * delta)
      : bead.radius;
    if (radius > GONE_RADIUS) {
      kept.push({ x, y, vx, radius, age, life: bead.life, free });
    }
  }
  return kept;
}

type Shedding = Pick<LiquidBody, "beads" | "shedAt" | "seed">;

/**
 * Sheds a bead from the trailing edge when the body has `moved` far enough
 * since the last one. The bead starts at a particle on the trailing edge,
 * inside the body, and swells out of it.
 */
function shed(
  last: Shedding,
  x: Float32Array,
  y: Float32Array,
  moved: number,
  step: number,
  spacing: number,
  low: number,
  high: number,
): Shedding {
  const trailing = moved > 0 ? Math.min(...x) : Math.max(...x);
  if (moved === 0 || Math.abs(trailing - last.shedAt) < spacing) {
    return last;
  }
  let seed = last.seed;
  const draw = () => {
    seed = (Math.imul(seed ^ (seed >>> 15), 0x2c1b3c6d) + 1) >>> 0;
    return ((seed >>> 8) & 0xffffff) / 0x1000000;
  };
  if (draw() > SHED_CHANCE || last.beads.length >= MAX_BEADS) {
    return { beads: last.beads, shedAt: trailing, seed };
  }
  const radius = between(draw(), BEAD_RADIUS);
  const life = between(draw(), BEAD_LIFE);
  const height = (low + high) / 2 + (draw() - 0.5) * (0.9 + high - low);
  const direction = Math.sign(moved);
  let at = -1;
  let ahead = Number.POSITIVE_INFINITY;
  for (let i = 0; i < x.length; i++) {
    if (Math.abs(y[i] - height) < 0.2 && x[i] * direction < ahead) {
      at = i;
      ahead = x[i] * direction;
    }
  }
  const beads =
    at < 0
      ? last.beads
      : [
          ...last.beads,
          {
            x: x[at],
            y: y[at],
            vx: (BEAD_CARRY * moved) / step,
            radius,
            age: 0,
            life,
            free: false,
          },
        ];
  return { beads, shedAt: trailing, seed };
}

/**
 * The reach of the particles after a step of `step` seconds on the
 * liquid's clock: it moves from `scale` towards the reach that fills the
 * pill of `span` with `count` particles.
 *
 * @internal
 */
export function scaleAfter(
  scale: number,
  span: number,
  count: number,
  step: number,
  girth = 0,
) {
  const goal = scaleFor(span, count, girth);
  return goal + (scale - goal) * Math.exp(-SCALE_RATE * step);
}

/**
 * The substeps of one step of `step` seconds on the liquid's clock, as
 * the compute shader runs them: the walls move in behind the liquid, and
 * the particles tilt, slow, press and slide along the walls. Production
 * runs `liquidSimulation` instead. That shader sums the pairs of each
 * particle from the positions at the start of a pass, but this applies each
 * pair in turn, so the two agree in their physics but not bit for bit.
 *
 * @internal
 */
export function simulateLiquid(
  body: LiquidParticles,
  input: LiquidInput,
  scale: number,
  step: number,
): LiquidParticles {
  const count = body.x.length;
  const walls = wallsFor(body, input, scale);
  const x = new Float32Array(body.x);
  const y = new Float32Array(body.y);
  const vx = new Float32Array(body.vx);
  const vy = new Float32Array(body.vy);
  let fastest = 0;
  for (let i = 0; i < count; i++) {
    fastest = Math.max(fastest, Math.hypot(vx[i], vy[i]));
  }
  const substeps = substepCount(step, fastest);
  for (let n = 0; n < substeps; n++) {
    substep(x, y, vx, vy, input, walls, scale, step / substeps);
  }
  return {
    x,
    y,
    vx,
    vy,
    from: walls.from,
    to: walls.to,
    low: walls.low,
    high: walls.high,
  };
}

/**
 * The body after a step of `delta` seconds whose substeps moved its
 * particles to `moved`: it reads where the liquid is and how fast it goes,
 * settles and freezes it once it has arrived, moves its beads and sheds
 * new ones. `elapsed` is how long on the liquid's clock the particles took
 * to go from the body's to `moved`: the step, unless the GPU moved them
 * over more than one frame, or not at all since the body last read them.
 *
 * @internal
 */
export function settleLiquid(
  body: LiquidBody,
  moved: LiquidParticles,
  input: LiquidInput,
  delta: number,
  elapsed = liquidStep(delta),
): LiquidBody {
  const { target, span, pressed, low = 0, high = 0 } = input;
  const count = body.x.length;
  const step = liquidStep(delta);
  const girth = (high - low) / 2;
  const goal = scaleFor(span, count, girth);
  const scale = scaleAfter(body.scale, span, count, step, girth);
  const { x, y, from, to } = moved;
  const vx = new Float32Array(moved.vx);
  const vy = new Float32Array(moved.vy);
  const walls = { from, to, low: moved.low, high: moved.high };
  let speedSum = 0;
  for (let i = 0; i < count; i++) {
    speedSum += Math.hypot(vx[i], vy[i]);
  }
  const speed = speedSum / count;
  const centre = mean(x);
  const away = Math.abs(target - centre);
  const boost = tiltBoost(away);
  const arrived = away < ARRIVE_REACH + ARRIVE_SPAN * span;
  const calm = clamp01(body.calm + (arrived ? SETTLE : -CALM_FALL) * step);
  // The liquid sets only as far as `LINGER_SET` while it lingers, so that
  // its rim stays water and flows. It sets all the way at the end.
  const setGoal = calm >= 1 - SET_TIME / LINGER ? 1 : LINGER_SET;
  const set =
    arrived && !pressed
      ? Math.max(body.set, Math.min(setGoal, body.set + SET * step))
      : clamp01(body.set - MELT * step);
  const kept: Shedding = {
    beads: moveBeads(
      body.beads,
      { x, y },
      step,
      input,
      walls,
      scale,
      boost,
      arrived,
    ),
    shedAt: body.shedAt,
    seed: body.seed,
  };
  const { beads, shedAt, seed } =
    speed < SHED_SPEED || away < SHED_REACH || elapsed <= 0
      ? kept
      : shed(
          kept,
          x,
          y,
          centre - mean(body.x),
          elapsed,
          Math.max(SHED_SPACING, (input.to - input.from) / SHED_BUDGET),
          low,
          high,
        );
  const settled =
    calm >= 1 &&
    speed < STILL_SPEED &&
    set === (pressed ? 0 : 1) &&
    beads.length === 0 &&
    Math.abs(scale - goal) < 1e-3;
  if (settled) {
    vx.fill(0);
    vy.fill(0);
  }
  return {
    x,
    y,
    vx,
    vy,
    calm,
    set,
    settled,
    scale: settled ? goal : scale,
    from,
    to,
    low: moved.low,
    high: moved.high,
    beads,
    shedAt,
    seed,
  };
}

/**
 * The particles of a body as the GPU last had them, and the time on the
 * liquid's clock they are from.
 *
 * @internal
 */
export interface LiquidSnapshot {
  readonly particles: LiquidParticles;
  readonly time: number;
}

/**
 * Settles the body on `snapshot` when it is newer than `particlesAt`, the
 * time on the liquid's clock of the particles the body last read, and on
 * its own particles when it is not. Returns the body and the time of its
 * particles.
 *
 * @internal
 */
export function settleOnSnapshot(
  body: LiquidBody,
  snapshot: LiquidSnapshot | null,
  particlesAt: number,
  input: LiquidInput,
  delta: number,
): { body: LiquidBody; particlesAt: number } {
  if (snapshot === null || snapshot.time <= particlesAt) {
    return { body: settleLiquid(body, body, input, delta, 0), particlesAt };
  }
  return {
    body: settleLiquid(
      body,
      snapshot.particles,
      input,
      delta,
      snapshot.time - particlesAt,
    ),
    particlesAt: snapshot.time,
  };
}

/**
 * The body under reduced motion: the frozen rest shape at the target.
 *
 * @internal
 */
export function frozenLiquid(body: LiquidBody, input: LiquidInput) {
  return restingLiquid(input.target, {
    seed: body.seed,
    span: input.span,
    low: input.low,
    high: input.high,
    count: body.x.length,
    from: input.from,
    to: input.to,
  });
}

/**
 * Moves the liquid on by `delta` seconds, all on the CPU, where the effect
 * runs the substeps on the GPU. Under reduced motion it goes straight to
 * the target as the frozen rest shape and sheds nothing.
 *
 * @internal
 */
export function stepLiquid(
  body: LiquidBody,
  input: LiquidInput,
  delta: number,
): LiquidBody {
  if (input.reducedMotion) {
    return frozenLiquid(body, input);
  }
  const step = liquidStep(delta);
  const scale = scaleAfter(
    body.scale,
    input.span,
    body.x.length,
    step,
    ((input.high ?? 0) - (input.low ?? 0)) / 2,
  );
  return settleLiquid(
    body,
    simulateLiquid(body, input, scale, step),
    input,
    delta,
  );
}
