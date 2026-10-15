import { smoothstep } from "../smoothstep.ts";
import { pcg } from "./pcg-wgsl.ts";

/**
 * The pixels of the selected surface while its pill moves: a grid of small
 * square pixels, each in its cell of the pill. The faster the pill moves,
 * the more pixels its trailing edge lets go. A pixel that goes leaves a
 * hole in its cell and becomes a particle of its own: it leaves with the
 * pill's speed, drag slows it so that it falls behind, and it drifts a
 * little. It lives for `SHED_LIFETIME` seconds, give or take
 * `LIFETIME_VARY` of that, and never comes back. As the pill slows, the
 * body grows back into the holes from the inside out, and the edge is whole
 * again once the pill is slower than `PIXEL_PHYSICS.REGROW_SPEED`.
 *
 * Positions are in CSS px in track space: `x` along the track from the
 * centre of the first rest circle, `y` from the centre line. In production
 * the compute shader of `PIXEL_COMPUTE_WGSL` moves the pixels on the GPU,
 * and `stepPixels` runs the same physics on the CPU.
 *
 * @internal
 */
export const PIXEL_FLOATS = 8;

/**
 * The cell is whole.
 *
 * @internal
 */
export const IN_CELL = 0;
/**
 * The cell's pixel has left it, and the cell is a hole.
 *
 * @internal
 */
export const AWAY = 1;
/**
 * The cell is outside the pill's shape: it has no pixel.
 *
 * @internal
 */
export const NO_PIXEL = 2;

/**
 * A pill in track space, in CSS px: its centre along the track, half its
 * straight part, and its radius.
 *
 * @internal
 */
export interface PixelPill {
  readonly x: number;
  readonly span: number;
  readonly radius: number;
}

/**
 * The cells of a pill: `cols` along the track and `rows` across it. The
 * pixel at index `row * cols + col` has the cell at `(col, row)`, which a
 * longer pill stretches along the track.
 *
 * @internal
 */
export interface PixelGrid {
  readonly cols: number;
  readonly rows: number;
}

/**
 * The most pixels one control has. A larger pill gets larger cells.
 *
 * @internal
 */
export const MAX_PIXELS = 8192;

/**
 * Seconds that a shed pixel lives.
 *
 * @internal
 */
export const SHED_LIFETIME = 0.4;
/**
 * Each shed pixel lives up to this share longer or shorter than
 * `SHED_LIFETIME`.
 *
 * @internal
 */
export const LIFETIME_VARY = 0.2;

/**
 * Seconds that a shed pixel with the number `vary`, from 0 to 1, lives.
 *
 * @internal
 */
export function pixelLifetime(vary: number) {
  return SHED_LIFETIME * (1 + LIFETIME_VARY * (2 * vary - 1));
}

/**
 * The physics of a pixel, in CSS px and seconds, which
 * `PIXEL_COMPUTE_WGSL` bakes in.
 *
 * @internal
 */
export const PIXEL_PHYSICS = {
  SUBSTEP: 1 / 960,
  /**
   * The pill sheds pixels as its speed goes from `SPEED_LEAST` to
   * `SPEED_MOST`, in px per second: at most `SHED_RATE` of each pixel per
   * second at its trailing edge, and less the further in.
   */
  SPEED_LEAST: 200,
  SPEED_MOST: 3000,
  SHED_RATE: 110,
  /**
   * A pill that brakes pushes its trailing edge into its body, so it sheds
   * less, and nothing once it brakes at `BRAKE_PUSH` px per second squared
   * or more.
   */
  BRAKE_PUSH: 25000,
  /**
   * How far in from the trailing edge, in px, the pill sheds and keeps its
   * holes: `SHED_REACH` at `HOLD_SPEED` px per second or more, and less as
   * it slows, to none at `REGROW_SPEED`. A hole that is further in than
   * that grows back.
   */
  SHED_REACH: 8,
  HOLD_SPEED: 1200,
  REGROW_SPEED: 200,
  /**
   * A pixel leaves up to `SHED_SPREAD` of the pill's speed faster or
   * slower, and up to `SHED_KICK` px per second across the track.
   */
  SHED_SPREAD: 0.12,
  SHED_KICK: 40,
  /** The drag on a shed pixel, per second, and the random push that makes it drift, in px per second squared at most. */
  DRAG: 35,
  JITTER: 4000,
} as const;

/**
 * The most substeps one step takes: a step is at most a tenth of a second.
 *
 * @internal
 */
export const PIXEL_MAX_SUBSTEPS = 96;

/**
 * The cells of a pill whose cells are `cell` px wide, at most `MAX_PIXELS`.
 *
 * @internal
 */
export function pixelGrid(pill: PixelPill, cell: number): PixelGrid {
  const width = 2 * (pill.span + pill.radius);
  const height = 2 * pill.radius;
  const size = Math.max(cell, Math.sqrt((width * height) / MAX_PIXELS) * 1.001);
  return {
    cols: Math.max(1, Math.round(width / size)),
    rows: Math.max(1, Math.round(height / size)),
  };
}

const UNSTRETCHED = [1, 1] as const;

/**
 * The centre of the cell of pixel `index` in `pill`, which `stretch`
 * stretches along the track and across it about its centre.
 *
 * @internal
 */
export function cellOf(
  pill: PixelPill,
  grid: PixelGrid,
  index: number,
  stretch: readonly [number, number] = UNSTRETCHED,
): readonly [number, number] {
  const col = index % grid.cols;
  const row = Math.floor(index / grid.cols);
  return [
    pill.x +
      ((2 * (col + 0.5)) / grid.cols - 1) *
        (pill.span + pill.radius) *
        stretch[0],
    ((2 * (row + 0.5)) / grid.rows - 1) * pill.radius * stretch[1],
  ];
}

const pcgUnit = (n: number) => pcg(n) / 4294967296;

/**
 * Puts the pixel `i` of a pill at rest in its cell: `seed` varies each
 * pixel's kick and lifetime, so no two moves are the same. A cell that the
 * pill's shape, with corners of `corner` px, does not reach has no pixel.
 */
function seedPixel(
  pixels: Float32Array,
  i: number,
  grid: PixelGrid,
  { pill, seed, corner }: PixelInput,
) {
  const width = 2 * (pill.span + pill.radius);
  const reach =
    0.5 * Math.hypot(width / grid.cols, (2 * pill.radius) / grid.rows);
  const round = Math.min(corner, pill.radius);
  const [x, y] = cellOf(pill, grid, i);
  const dx = Math.abs(x - pill.x) - (pill.span + pill.radius - round);
  const dy = Math.abs(y) - (pill.radius - round);
  const distance =
    Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) +
    Math.min(Math.max(dx, dy), 0) -
    round;
  pixels.set(
    [
      x,
      y,
      0,
      0,
      distance > reach ? NO_PIXEL : IN_CELL,
      -1,
      pcgUnit(seed * 8191 + i * 2),
      pcgUnit(seed * 8191 + i * 2 + 1),
    ],
    i * PIXEL_FLOATS,
  );
}

/**
 * The pixel `i` has left its cell, and is alive `time` seconds after the
 * pill started to move.
 *
 * @internal
 */
export function pixelAlive(pixels: Float32Array, i: number, time: number) {
  const at = i * PIXEL_FLOATS;
  const born = pixels[at + 5];
  return born >= 0 && time - born < pixelLifetime(pixels[at + 7]);
}

/**
 * What one step of the pixels reads from the control.
 *
 * @internal
 */
export interface PixelInput {
  /** The pill, where it is at the end of the step. */
  readonly pill: PixelPill;
  /**
   * How fast the pill moves along the track, in px per second, at the end
   * of the step. At 0 it sheds nothing, and every hole grows back.
   */
  readonly speed: number;
  /** The pill's push along the track, in px per second squared. */
  readonly push: number;
  /** How far the pill stretches along the track and across it. */
  readonly stretch: readonly [number, number];
  /** Seconds since the pill started to move, at the start of the step. */
  readonly time: number;
  /**
   * The step's number, which varies what the pill sheds. Step 0 first puts
   * each pixel in its cell, as `seed` varies them, in a shape with corners
   * of `corner` px.
   */
  readonly tick: number;
  readonly seed: number;
  readonly corner: number;
}

function pixelSubsteps(delta: number) {
  return Math.min(
    PIXEL_MAX_SUBSTEPS,
    Math.max(1, Math.ceil(delta / PIXEL_PHYSICS.SUBSTEP - 1e-6)),
  );
}

/** The random numbers of a step past those of its substeps. */
const SPREAD_SALT = 100;
const JITTER_SALT = 101;

/**
 * Moves the pixels `delta` seconds on, in place, and returns how many
 * cells are holes.
 *
 * @internal
 */
export function stepPixels(
  pixels: Float32Array,
  grid: PixelGrid,
  input: PixelInput,
  delta: number,
) {
  const count = grid.cols * grid.rows;
  let holes = 0;
  for (let i = 0; i < count; i++) {
    if (stepPixel(pixels, i, grid, input, delta)) {
      holes++;
    }
  }
  return holes;
}

/** One pixel's step, as each invocation of `PIXEL_COMPUTE_WGSL` takes it. */
function stepPixel(
  pixels: Float32Array,
  i: number,
  grid: PixelGrid,
  input: PixelInput,
  delta: number,
) {
  const { SHED_SPREAD, SHED_KICK, DRAG, JITTER } = PIXEL_PHYSICS;
  if (input.tick === 0) {
    seedPixel(pixels, i, grid, input);
  }
  const at = i * PIXEL_FLOATS;
  let x = pixels[at];
  let y = pixels[at + 1];
  let vx = pixels[at + 2];
  let vy = pixels[at + 3];
  let state = pixels[at + 4];
  let born = pixels[at + 5];
  const own = pixels[at + 6];
  const life = pixelLifetime(pixels[at + 7]);
  if (state === NO_PIXEL) {
    return false;
  }
  const { pill, speed, push, stretch, time, tick } = input;
  const [cellX, cellY] = cellOf(pill, grid, i, stretch);
  const depth = trailingDepth(pill, stretch, speed, cellX, cellY);
  const chance = shedChance(speed, push, depth);
  if (state === IN_CELL && chance === 0 && !(born >= 0 && time - born < life)) {
    return false;
  }
  const spread = 2 * pcgUnit(i ^ pcg(tick * 128 + SPREAD_SALT)) - 1;
  const jitterX = JITTER * (2 * pcgUnit(i ^ pcg(tick * 128 + JITTER_SALT)) - 1);
  const jitterY =
    JITTER * (2 * pcgUnit(i ^ pcg(tick * 128 + JITTER_SALT + 1)) - 1);
  const n = pixelSubsteps(delta);
  const h = delta / n;
  for (let k = 0; k < n; k++) {
    const now = time + (k + 1) * h;
    let alive = born >= 0 && now - born < life;
    if (
      state === IN_CELL &&
      !alive &&
      chance > 0 &&
      pcgUnit(i ^ pcg(tick * 128 + k)) < chance * h
    ) {
      // The pill moves through the step with its push, and is where `pill`
      // puts it at its end.
      const ahead = delta - (k + 1) * h;
      x = cellX - (speed * ahead - 0.5 * push * ahead * ahead);
      y = cellY;
      vx = (speed - push * ahead) * (1 + SHED_SPREAD * spread);
      vy = SHED_KICK * (2 * own - 1);
      state = AWAY;
      born = now;
      alive = true;
    }
    if (alive) {
      vx += (jitterX - DRAG * vx) * h;
      vy += (jitterY - DRAG * vy) * h;
      x += vx * h;
      y += vy * h;
    }
  }
  const reach = edgeReach(speed);
  if (state === AWAY && (reach <= 0 || depth >= reach)) {
    state = IN_CELL;
  }
  pixels[at] = x;
  pixels[at + 1] = y;
  pixels[at + 2] = vx;
  pixels[at + 3] = vy;
  pixels[at + 4] = state;
  pixels[at + 5] = born;
  return state === AWAY;
}

/**
 * How much a speed of `speed` px per second sheds, from 0 at `SPEED_LEAST`
 * to 1 at `SPEED_MOST`.
 *
 * @internal
 */
export function speedShare(speed: number) {
  const { SPEED_LEAST, SPEED_MOST } = PIXEL_PHYSICS;
  return Math.min(
    1,
    Math.max(0, (Math.abs(speed) - SPEED_LEAST) / (SPEED_MOST - SPEED_LEAST)),
  );
}

/**
 * How far in from the trailing edge, in px, a pill at `speed` px per second
 * sheds and keeps its holes.
 */
function edgeReach(speed: number) {
  const { SHED_REACH, REGROW_SPEED, HOLD_SPEED } = PIXEL_PHYSICS;
  return SHED_REACH * smoothstep(REGROW_SPEED, HOLD_SPEED, Math.abs(speed));
}

/**
 * How far the point `(x, y)` is in from the trailing edge of `pill`, which
 * `stretch` stretches and which moves the way of `speed`, in px along the
 * track, as `trailingDepth` of `PIXEL_SHARED_WGSL`.
 */
function trailingDepth(
  pill: PixelPill,
  stretch: readonly [number, number],
  speed: number,
  x: number,
  y: number,
) {
  const across = y / stretch[1];
  const half =
    (pill.span +
      Math.sqrt(Math.max(0, pill.radius * pill.radius - across * across))) *
    stretch[0];
  return half + Math.sign(speed) * (x - pill.x);
}

/**
 * The share of the pixel `depth` px in from the trailing edge that a pill
 * at `speed` px per second, with a push of `push` px per second squared,
 * sheds per second.
 */
function shedChance(speed: number, push: number, depth: number) {
  const { SHED_RATE, BRAKE_PUSH } = PIXEL_PHYSICS;
  const share = speedShare(speed);
  const reach = edgeReach(speed);
  if (share <= 0 || reach <= 0) {
    return 0;
  }
  const brake = 1 - smoothstep(0, BRAKE_PUSH, -Math.sign(speed) * push);
  return SHED_RATE * share * brake * (1 - smoothstep(0, reach, depth));
}
