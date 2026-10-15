import { PCG_WGSL } from "./pcg-wgsl.ts";
import {
  AWAY,
  IN_CELL,
  LIFETIME_VARY,
  NO_PIXEL,
  PIXEL_FLOATS,
  PIXEL_MAX_SUBSTEPS,
  PIXEL_PHYSICS,
  SHED_LIFETIME,
  type PixelGrid,
  type PixelInput,
} from "./step-pixels.ts";
import { TARGET_WGSL } from "./target-wgsl.ts";

/**
 * The byte size of one `Pixel`.
 *
 * @internal
 */
export const PIXEL_BYTES = PIXEL_FLOATS * 4;

const wgslFloat = (value: number) => {
  const text = String(value);
  return /[.e]/.test(text) ? text : `${text}.0`;
};

const physicsConstants = Object.entries(PIXEL_PHYSICS)
  .map(([name, value]) => `const ${name} = ${wgslFloat(value)};`)
  .join("\n");

/**
 * What the pixels' simulation and their drawing share: one pixel as the
 * pixel buffer holds it, its states, how long it lives once it leaves its
 * cell, the physics of `stepPixels`, and how deep a point is in a pill.
 *
 * @internal
 */
export const PIXEL_SHARED_WGSL = /* wgsl */ `
const IN_CELL = ${wgslFloat(IN_CELL)};
const AWAY = ${wgslFloat(AWAY)};
const NO_PIXEL = ${wgslFloat(NO_PIXEL)};
const SHED_LIFETIME = ${wgslFloat(SHED_LIFETIME)};
const LIFETIME_VARY = ${wgslFloat(LIFETIME_VARY)};
${physicsConstants}

struct Pixel {
  // Its position and its velocity in track space, in CSS px.
  motion: vec4f,
  // The state of its cell, when it left the cell or -1, and its own two
  // numbers from 0 to 1.
  life: vec4f,
}

fn pixelLifetime(vary: f32) -> f32 {
  return SHED_LIFETIME * (1.0 + LIFETIME_VARY * (2.0 * vary - 1.0));
}

// How far a point in track space is in from the trailing edge of a pill,
// along the track, in px. The pill is its centre, half its straight part
// and its radius, which stretch stretches along the track and across it.
// It moves the way of heading.
fn trailingDepth(pill: vec3f, stretch: vec2f, heading: f32, point: vec2f) -> f32 {
  let across = point.y / stretch.y;
  let half = (pill.y + sqrt(max(0.0, pill.z * pill.z - across * across))) * stretch.x;
  return half + sign(heading) * (point.x - pill.x);
}
`;

/**
 * One control's step of the pixels this frame, as `stepPixels` takes it.
 *
 * @internal
 */
export interface PixelStep extends PixelInput {
  /** The first pixel of the control in the pixel buffer. */
  readonly offset: number;
  readonly grid: PixelGrid;
  readonly delta: number;
}

/**
 * The byte size of one `PixelStep`.
 *
 * @internal
 */
export const PIXEL_STEP_BYTES = 64;

const STEP_WORDS = PIXEL_STEP_BYTES / 4;

/**
 * Packs the steps in order as `PixelStep` structs at the start of `buffer`.
 *
 * @internal
 */
export function packPixelSteps(
  steps: readonly PixelStep[],
  buffer: ArrayBuffer,
) {
  const floats = new Float32Array(buffer);
  const words = new Uint32Array(buffer);
  for (const [index, step] of steps.entries()) {
    const at = index * STEP_WORDS;
    const { pill, grid } = step;
    words.set([step.offset, grid.cols * grid.rows, grid.cols, grid.rows], at);
    floats.set([pill.x, pill.span, pill.radius, step.speed], at + 4);
    floats.set([step.time, step.delta, step.tick], at + 8);
    words[at + 11] = step.seed >>> 0;
    floats.set([step.push, ...step.stretch, step.corner], at + 12);
  }
}

/**
 * The invocations of one workgroup of `PIXEL_COMPUTE_WGSL`.
 *
 * @internal
 */
export const PIXEL_WORKGROUP_SIZE = 64;

/**
 * The simulation of the pixels: `stepPixels` on the GPU, one invocation per
 * pixel, with the steps of the frame along the second dimension of the
 * dispatch. Each pixel moves on its own, so no invocation waits for
 * another. Each cell that is a hole adds one to its step's count in
 * `moving`, which the CPU reads back to know when the pill is whole.
 *
 * @internal
 */
export const PIXEL_COMPUTE_WGSL = /* wgsl */ `${PIXEL_SHARED_WGSL}
${PCG_WGSL}
const PIXEL_MAX_SUBSTEPS = ${String(PIXEL_MAX_SUBSTEPS)}u;
const SPREAD_SALT = 100u;
const JITTER_SALT = 101u;

struct PixelStep {
  offset: u32,
  count: u32,
  cols: u32,
  rows: u32,
  // The pill: its centre, half its straight part, its radius, and how fast
  // it moves along the track.
  pill: vec4f,
  // Seconds since the pill started to move, the step, and the step's
  // number. Step 0 first puts each pixel in its cell, as the seed varies
  // them.
  clock: vec3f,
  seed: u32,
  // The pill's push, its stretch along the track and across it, and the
  // radius of the corners of its shape at rest.
  inertia: vec4f,
}

@group(0) @binding(0) var<storage, read> steps: array<PixelStep>;
@group(0) @binding(1) var<storage, read_write> pixels: array<Pixel>;
@group(0) @binding(2) var<storage, read_write> moving: array<atomic<u32>>;

fn pcgUnit(n: u32) -> f32 {
  return f32(pcg(n)) / 4294967296.0;
}

// The centre of the cell of pixel i in a pill of cols by rows cells: its
// centre, half its straight part and its radius, stretched along the track
// and across it about its centre.
fn pixelCell(pill: vec4f, stretch: vec2f, cols: u32, rows: u32, i: u32) -> vec2f {
  let col = f32(i % cols);
  let row = f32(i / cols);
  return vec2f(
    pill.x + (2.0 * (col + 0.5) / f32(cols) - 1.0) * (pill.y + pill.z) * stretch.x,
    (2.0 * (row + 0.5) / f32(rows) - 1.0) * pill.z * stretch.y,
  );
}

// Pixel i in its cell of the pill at rest. A cell that the pill's shape
// does not reach has no pixel.
fn seedPixel(step: PixelStep, i: u32) -> Pixel {
  let pill = step.pill;
  let cell = pixelCell(pill, vec2f(1.0), step.cols, step.rows, i);
  let width = 2.0 * (pill.y + pill.z);
  let reach = 0.5 * length(vec2f(width / f32(step.cols), 2.0 * pill.z / f32(step.rows)));
  let round = min(step.inertia.w, pill.z);
  let d = vec2f(abs(cell.x - pill.x) - (pill.y + pill.z - round), abs(cell.y) - (pill.z - round));
  let distance = length(max(d, vec2f(0.0))) + min(max(d.x, d.y), 0.0) - round;
  let n = step.seed * 8191u + i * 2u;
  return Pixel(
    vec4f(cell, 0.0, 0.0),
    vec4f(select(IN_CELL, NO_PIXEL, distance > reach), -1.0, pcgUnit(n), pcgUnit(n + 1u)),
  );
}

fn speedShare(speed: f32) -> f32 {
  return saturate((abs(speed) - SPEED_LEAST) / (SPEED_MOST - SPEED_LEAST));
}

fn edgeReach(speed: f32) -> f32 {
  return SHED_REACH * smoothstep(REGROW_SPEED, HOLD_SPEED, abs(speed));
}

// The share of the pixel depth in from the trailing edge that the pill
// sheds per second: less as it brakes.
fn shedChance(speed: f32, push: f32, depth: f32) -> f32 {
  let share = speedShare(speed);
  let reach = edgeReach(speed);
  if (share <= 0.0 || reach <= 0.0) {
    return 0.0;
  }
  let brake = 1.0 - smoothstep(0.0, BRAKE_PUSH, -sign(speed) * push);
  return SHED_RATE * share * brake * (1.0 - smoothstep(0.0, reach, depth));
}

@compute @workgroup_size(${String(PIXEL_WORKGROUP_SIZE)})
fn simulate(
  @builtin(workgroup_id) group: vec3u,
  @builtin(local_invocation_index) local: u32,
) {
  let step = steps[group.y];
  let i = group.x * ${String(PIXEL_WORKGROUP_SIZE)}u + local;
  if (i >= step.count) {
    return;
  }
  let index = step.offset + i;
  let tick = u32(step.clock.z);
  var pixel = pixels[index];
  if (tick == 0u) {
    pixel = seedPixel(step, i);
    pixels[index] = pixel;
  }
  var state = pixel.life.x;
  if (state == NO_PIXEL) {
    return;
  }
  var position = pixel.motion.xy;
  var velocity = pixel.motion.zw;
  var born = pixel.life.y;
  let own = pixel.life.z;
  let life = pixelLifetime(pixel.life.w);
  let time = step.clock.x;
  let delta = step.clock.y;
  let speed = step.pill.w;
  let push = step.inertia.x;
  let cell = pixelCell(step.pill, step.inertia.yz, step.cols, step.rows, i);
  let depth = trailingDepth(step.pill.xyz, step.inertia.yz, speed, cell);
  let chance = shedChance(speed, push, depth);
  if (state == IN_CELL && chance == 0.0 && !(born >= 0.0 && time - born < life)) {
    return;
  }
  let spread = 2.0 * pcgUnit(i ^ pcg(tick * 128u + SPREAD_SALT)) - 1.0;
  let jitter = JITTER * (2.0 * vec2f(
    pcgUnit(i ^ pcg(tick * 128u + JITTER_SALT)),
    pcgUnit(i ^ pcg(tick * 128u + JITTER_SALT + 1u)),
  ) - 1.0);
  let n = min(PIXEL_MAX_SUBSTEPS, max(1u, u32(ceil(delta / SUBSTEP - 1e-6))));
  let h = delta / f32(n);
  for (var k = 0u; k < n; k += 1u) {
    let now = time + f32(k + 1u) * h;
    var alive = born >= 0.0 && now - born < life;
    if (state == IN_CELL && !alive && chance > 0.0 && pcgUnit(i ^ pcg(tick * 128u + k)) < chance * h) {
      let ahead = delta - f32(k + 1u) * h;
      position = cell - vec2f(speed * ahead - 0.5 * push * ahead * ahead, 0.0);
      velocity = vec2f((speed - push * ahead) * (1.0 + SHED_SPREAD * spread), SHED_KICK * (2.0 * own - 1.0));
      state = AWAY;
      born = now;
      alive = true;
    }
    if (alive) {
      velocity += (jitter - DRAG * velocity) * h;
      position += velocity * h;
    }
  }
  let reach = edgeReach(speed);
  if (state == AWAY && (reach <= 0.0 || depth >= reach)) {
    state = IN_CELL;
  }
  pixels[index] = Pixel(vec4f(position, velocity), vec4f(state, born, own, pixel.life.w));
  if (state == AWAY) {
    atomicAdd(&moving[group.y], 1u);
  }
}
`;

/**
 * One control's shed pixels as a frame draws them.
 *
 * @internal
 */
export interface PixelDraw {
  readonly elementIndex: number;
  /** The control's pixels in the pixel buffer, which the draw call takes. */
  readonly offset: number;
  readonly count: number;
  /** A pixel's size in device pixels as it leaves its cell. */
  readonly cell: number;
  /** Where track space starts, in page coordinates. */
  readonly originX: number;
  readonly originY: number;
  /** Seconds since the pill started to move, where the pixels are. */
  readonly time: number;
  /** A pixel's colour as it leaves its cell, premultiplied. */
  readonly color: readonly [number, number, number, number];
  /** The faint shadow under each pixel, premultiplied. */
  readonly shadow: readonly [number, number, number, number];
  /** The light a fast pixel adds, as its leading edge catches it. */
  readonly light: readonly [number, number, number];
  /** The colour a pixel takes once it is away, premultiplied. */
  readonly tint: readonly [number, number, number, number];
}

/**
 * The byte size of one `PixelDraw`.
 *
 * @internal
 */
export const PIXEL_DRAW_BYTES = 96;

const DRAW_WORDS = PIXEL_DRAW_BYTES / 4;

/** @internal */
export function packPixelDraws(
  draws: readonly PixelDraw[],
  buffer: ArrayBuffer,
) {
  const floats = new Float32Array(buffer);
  const words = new Uint32Array(buffer);
  for (const [index, draw] of draws.entries()) {
    const at = index * DRAW_WORDS;
    words[at] = draw.elementIndex;
    floats.set(
      [draw.cell, draw.originX, draw.originY, draw.time, 0, 0, 0],
      at + 1,
    );
    floats.set(draw.color, at + 8);
    floats.set(draw.shadow, at + 12);
    floats.set([...draw.light, 0], at + 16);
    floats.set(draw.tint, at + 20);
  }
}

/**
 * Draws the shed pixels that are alive, each a square of whole device
 * pixels on the device pixel grid, so they stay crisp. Over its lifetime a
 * pixel takes the tint, shrinks, and fades out, fast at first and slowly
 * at the end. Each control draws twice over its pixels, as instances from
 * its first pixel: first every shadow, and then every pixel over them. The
 * first vertex tells the draw: 8 for each `PixelDraw` before the control's,
 * and 4 more for the pixels. A pixel that has not left its cell, or has
 * died, draws nothing.
 *
 * @internal
 */
export const PIXEL_WGSL = /* wgsl */ `${TARGET_WGSL}
${PIXEL_SHARED_WGSL}
// A shed pixel shrinks by this share of its size over its lifetime.
const SHED_SHRINK = 0.5;
// It takes the tint over this share of its lifetime.
const TINT_SHARE = 0.15;

struct PixelDraw {
  element: u32,
  cell: f32,
  origin: vec2f,
  time: f32,
  color: vec4f,
  shadow: vec4f,
  light: vec4f,
  tint: vec4f,
}

@group(2) @binding(0) var<storage, read> draws: array<PixelDraw>;
@group(2) @binding(1) var<storage, read> pixels: array<Pixel>;

struct PixelVarying {
  @builtin(position) position: vec4f,
  @location(0) @interpolate(flat) color: vec4f,
  @location(1) @interpolate(flat) element: u32,
}

@vertex
fn pixelVertex(
  @builtin(vertex_index) vertex: u32,
  @builtin(instance_index) index: u32,
) -> PixelVarying {
  let draw = draws[vertex / 8u];
  let corner = vec2f(f32(vertex & 1u), f32((vertex >> 1u) & 1u));
  let shadow = (vertex & 4u) == 0u;
  let pixel = pixels[index];
  let born = pixel.life.y;
  let age = (draw.time - born) / pixelLifetime(pixel.life.w);
  if (pixel.life.x == NO_PIXEL || born < 0.0 || age >= 1.0) {
    return PixelVarying(vec4f(2.0, 2.0, 0.0, 1.0), vec4f(0.0), draw.element);
  }
  let t = saturate(age);
  let scale = effectTarget.pixelScale;
  let size = max(1.0, round(draw.cell * (1.0 - SHED_SHRINK * t)));
  let page = draw.origin.xy + pixel.motion.xy;
  let device = floor((page - effectTarget.pageOffset) * scale - 0.5 * size + 0.5);
  var at = device + corner * size;
  let fade = (1.0 - t) * (1.0 - t);
  var color = draw.shadow * fade;
  if (shadow) {
    at.y += max(1.0, round(scale.y * 0.75));
  } else {
    let fast = smoothstep(500.0, 1800.0, length(pixel.motion.zw));
    let tinted = mix(draw.color, draw.tint, smoothstep(0.0, TINT_SHARE, t));
    color = (tinted + vec4f(draw.light.rgb * fast, 0.0)) * fade;
  }
  let unit = at / (effectTarget.cssSize * scale);
  return PixelVarying(vec4f(unit.x * 2.0 - 1.0, 1.0 - unit.y * 2.0, 0.0, 1.0), color, draw.element);
}

@fragment
fn pixelFragment(input: PixelVarying) -> @location(0) vec4f {
  let track = effectElements[input.element];
  let page = fragmentToPage(input.position.xy);
  let onTrack = saturate(0.5 - effectElementDistance(track, page) * effectTarget.pixelScale.x);
  let clip = onTrack * effectClip(track.scope, page);
  return vec4f(effectGrayscale(input.color.rgb, track.grayscale), input.color.a) * clip;
}
`;
