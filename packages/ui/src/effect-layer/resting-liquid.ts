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

/**
 * The disk the particles fill at rest, inside the wall by one particle.
 *
 * @internal
 */
export const PARTICLE_SPACING = Math.sqrt(Math.PI / PARTICLE_COUNT) * 0.93;
/** @internal */
export const PARTICLE_RADIUS = PARTICLE_SPACING / 2;
/** A low-discrepancy sequence in two dimensions, which fills a box evenly. */
const PLASTIC = [0.7548776662466927, 0.5698402909980532] as const;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** The area of a pill of radius 1 with a straight part `2 × span` long. */
function pillArea(span: number) {
  return Math.PI + 4 * Math.max(0, span);
}

/**
 * How many particles the liquid of a pill of `span` has: a thumb's count
 * for a circle, and more in proportion to the area, up to
 * `MAX_PARTICLE_COUNT`.
 *
 * @internal
 */
export function particleCountFor(span: number) {
  return Math.min(
    MAX_PARTICLE_COUNT,
    Math.max(
      PARTICLE_COUNT,
      Math.round((PARTICLE_COUNT * pillArea(span)) / Math.PI),
    ),
  );
}

/**
 * The reach of each of `count` particles that fill a pill of `span`,
 * against the reach of a thumb's: 1 for a thumb.
 *
 * @internal
 */
export function scaleFor(span: number, count: number) {
  return Math.sqrt((pillArea(span) / Math.PI) * (PARTICLE_COUNT / count));
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
 * a disk split into two halves at the ends, and a box between them.
 */
function restPositions(
  centre: number,
  span: number,
  count: number,
  scale: number,
): [Float32Array, Float32Array] {
  const x = new Float32Array(count);
  const y = new Float32Array(count);
  const radius = 1 - PARTICLE_RADIUS * scale;
  const disk = Math.PI * radius * radius;
  const box = 4 * span * radius;
  const inBox = span > 0 ? Math.round((count * box) / (disk + box)) : 0;
  const inDisk = count - inBox;
  for (let i = 0; i < inDisk; i++) {
    const distance = radius * Math.sqrt((i + 0.5) / inDisk);
    const angle = i * GOLDEN_ANGLE;
    const along = distance * Math.cos(angle);
    x[i] = centre + along + Math.sign(along) * span;
    y[i] = distance * Math.sin(angle);
  }
  for (let i = 0; i < inBox; i++) {
    const u = (0.5 + (i + 1) * PLASTIC[0]) % 1;
    const v = (0.5 + (i + 1) * PLASTIC[1]) % 1;
    x[inDisk + i] = centre + (2 * u - 1) * span;
    y[inDisk + i] = (2 * v - 1) * radius;
  }
  return [x, y];
}

/** @internal */
export const REST_DENSITY = restDensity();

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
    count = particleCountFor(span),
    from = target - span,
    to = target + span,
  }: {
    seed?: number;
    span?: number;
    count?: number;
    from?: number;
    to?: number;
  } = {},
): LiquidBody {
  const scale = scaleFor(span, count);
  const [x, y] = restPositions(target, span, count, scale);
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
    beads: [],
    shedAt: target,
    seed,
  };
}
