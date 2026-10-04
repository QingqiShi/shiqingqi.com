import {
  BEAM_CUTOFF,
  BEAM_DIVERGENCE,
  BEAM_DUST_REACH,
  BEAM_WIDTH,
} from "./beam-meets-rect.ts";
import { POINT_MASS_DISTANCE } from "./lens-from-box.ts";
import { TARGET_WGSL } from "./target-wgsl.ts";

const HEADER_FLOATS = 4;
const MAX_LENSES = 8;
const MAX_BEAMS = 4;
const LENS_FLOATS = 8;
const BEAM_FLOATS = 12;
const BEAM_OFFSET = HEADER_FLOATS + MAX_LENSES * LENS_FLOATS;

/**
 * The scene uniform: how many lenses and beams one frame draws at most, how
 * many floats each takes, and where each list starts, in floats.
 *
 * @internal
 */
export const SCENE_LAYOUT = {
  maxLenses: MAX_LENSES,
  maxBeams: MAX_BEAMS,
  lensFloats: LENS_FLOATS,
  beamFloats: BEAM_FLOATS,
  lensOffset: HEADER_FLOATS,
  beamOffset: BEAM_OFFSET,
  bytes: (BEAM_OFFSET + MAX_BEAMS * BEAM_FLOATS) * 4,
} as const;

const float = (value: number) => value.toFixed(4);

/**
 * Draws each Light beam as the page would see it behind every Black hole,
 * from the edge of its element and never inside it, and only inside its
 * Effect container.
 * Each pixel finds where its light comes from, `sourceOf` in
 * `lens-from-box.ts`, and lights it from the beams there: a thin core, a
 * soft edge that widens as the beam travels, and dust that the beam lights
 * up. Light that passes straight behind a Black hole shows as a ring around
 * it.
 *
 * @internal
 */
export const BLACK_HOLE_WGSL = /* wgsl */ `${TARGET_WGSL}
const MAX_LENSES = ${String(MAX_LENSES)}u;
const MAX_BEAMS = ${String(MAX_BEAMS)}u;
const CORE_WIDTH = 1.1;
const BEAM_WIDTH = ${float(BEAM_WIDTH)};
const BEAM_DIVERGENCE = ${float(BEAM_DIVERGENCE)};
const DUST_CELL = 7.0;
const DUST_DENSITY = 0.28;
const DUST_REACH = ${float(BEAM_DUST_REACH)};
const POINT_MASS_DISTANCE = ${float(POINT_MASS_DISTANCE)};
const CUTOFF = ${float(BEAM_CUTOFF)};

struct Lens {
  center: vec2f,
  halfSize: vec2f,
  cornerRadius: f32,
  mass: f32,
  falloff: f32,
  element: u32,
}

struct Beam {
  origin: vec2f,
  direction: vec2f,
  color: vec3f,
  reach: f32,
  start: f32,
  element: u32,
}

struct Scene {
  lensCount: u32,
  beamCount: u32,
  dark: f32,
  // The index in effectScopes of the scope of every beam and lens.
  scope: u32,
  lenses: array<Lens, MAX_LENSES>,
  beams: array<Beam, MAX_BEAMS>,
}

@group(2) @binding(0) var<uniform> scene: Scene;

@vertex
fn vertexMain(@builtin(vertex_index) vertex: u32) -> @builtin(position) vec4f {
  let corner = vec2f(f32((vertex << 1u) & 2u), f32(vertex & 2u));
  return vec4f(corner * 2.0 - 1.0, 0.0, 1.0);
}

// pcg3d, from "Hash Functions for GPU Rendering" (Jarzynski and Olano, 2020).
fn hash3(cell: vec2i) -> vec3f {
  var value = vec3u(bitcast<vec2u>(cell), 0x9e3779b9u) * 1664525u + 1013904223u;
  value.x += value.y * value.z;
  value.y += value.z * value.x;
  value.z += value.x * value.y;
  value ^= value >> vec3u(16u);
  value.x += value.y * value.z;
  value.y += value.z * value.x;
  value.z += value.x * value.y;
  return vec3f(value) / 4294967296.0;
}

// One corner's share of boxBend in lens-from-box.ts.
fn cornerBend(corner: vec2f) -> vec2f {
  let halfLog = 0.5 * log(max(dot(corner, corner), 1e-6));
  let safe = select(corner, vec2f(1e-6), abs(corner) < vec2f(1e-6));
  return vec2f(
    corner.x * atan(corner.y / safe.x) + corner.y * halfLog,
    corner.y * atan(corner.x / safe.y) + corner.x * halfLog,
  );
}

// massHalfSize in lens-from-box.ts.
fn massHalfSize(lens: Lens) -> vec2f {
  return max(lens.halfSize - lens.cornerRadius, vec2f(0.5));
}

// lensBend in lens-from-box.ts.
fn lensBend(lens: Lens, page: vec2f) -> vec2f {
  let offset = page - lens.center;
  let squared = dot(offset, offset);
  let fade = 1.0 / (1.0 + squared / lens.falloff);
  let held = massHalfSize(lens);
  let far = POINT_MASS_DISTANCE * max(held.x, held.y);
  if (squared > far * far) {
    return offset * lens.mass * fade / squared;
  }
  let low = offset + held;
  let high = offset - held;
  let bend = cornerBend(low) - cornerBend(vec2f(low.x, high.y)) -
    cornerBend(vec2f(high.x, low.y)) + cornerBend(high);
  return bend * lens.mass * fade / (4.0 * held.x * held.y);
}

// How brightly a beam lights a point: x is the core and the soft edge, y is
// the light that dust there would catch.
fn beamLight(beam: Beam, source: vec2f) -> vec2f {
  let offset = source - beam.origin;
  let along = dot(offset, beam.direction);
  if (along <= 0.0 || along >= beam.reach) {
    return vec2f(0.0);
  }
  let across = dot(offset, vec2f(-beam.direction.y, beam.direction.x));
  let spread = BEAM_WIDTH + along * BEAM_DIVERGENCE;
  if (abs(across) > spread * DUST_REACH * CUTOFF) {
    return vec2f(0.0);
  }
  let fade = smoothstep(0.0, max(beam.start, 1.0), along) *
    (1.0 - smoothstep(beam.reach * 0.3, beam.reach, along));
  let core = exp(-(across * across) / (CORE_WIDTH * CORE_WIDTH));
  let soft = exp(-(across * across) / (spread * spread)) * BEAM_WIDTH / spread;
  let dustSpread = spread * DUST_REACH;
  let dust = exp(-(across * across) / (dustSpread * dustSpread)) * sqrt(BEAM_WIDTH / spread);
  let softGain = select(0.13, 0.2, scene.dark > 0.5);
  return vec2f(core * 0.85 + soft * softGain, dust) * fade;
}

// Whether a beam can light a point that is this bend or less from a page
// point. The test is cheap, so most pixels do not do the lens calculation.
fn beamNear(beam: Beam, page: vec2f, bend: f32) -> bool {
  let offset = page - beam.origin;
  let along = dot(offset, beam.direction);
  let across = dot(offset, vec2f(-beam.direction.y, beam.direction.x));
  let spread = BEAM_WIDTH + max(along + bend, 0.0) * BEAM_DIVERGENCE;
  return along > -bend && along < beam.reach + bend &&
    abs(across) < spread * DUST_REACH * CUTOFF + bend;
}

@fragment
fn fragmentMain(@builtin(position) position: vec4f) -> @location(0) vec4f {
  let page = fragmentToPage(position.xy);
  let clip = effectClip(scene.scope, page);
  if (clip <= 0.0) {
    return vec4f(0.0);
  }
  // A mass bends light by at most its mass over its distance.
  var bend = 0.0;
  for (var index = 0u; index < scene.lensCount; index += 1u) {
    let lens = scene.lenses[index];
    if (effectElementDistance(effectElements[lens.element], page) < 0.0) {
      return vec4f(0.0);
    }
    let outside = max(abs(page - lens.center) - massHalfSize(lens), vec2f(0.0));
    let clamped = max(length(outside), 1.0);
    bend += lens.mass / (clamped * (1.0 + clamped * clamped / lens.falloff));
  }
  var near = false;
  for (var index = 0u; index < scene.beamCount; index += 1u) {
    near = near || beamNear(scene.beams[index], page, bend);
  }
  if (!near) {
    return vec4f(0.0);
  }

  var source = page;
  for (var index = 0u; index < scene.lensCount; index += 1u) {
    source -= lensBend(scene.lenses[index], page);
  }

  let cell = floor(source / DUST_CELL);
  let random = hash3(vec2i(cell));
  var mote = 0.0;
  var moteCenter = source;
  if (random.z < DUST_DENSITY) {
    moteCenter = (cell + 0.2 + 0.6 * random.xy) * DUST_CELL;
    let size = mix(0.45, 0.95, random.z / DUST_DENSITY);
    let distance = length(source - moteCenter);
    mote = exp(-(distance * distance) / (size * size)) * mix(0.35, 1.0, fract(random.z * 37.0));
  }

  let dark = scene.dark > 0.5;
  var light = vec3f(0.0);
  var alpha = 0.0;
  for (var index = 0u; index < scene.beamCount; index += 1u) {
    let beam = scene.beams[index];
    let beamAt = beamLight(beam, source);
    var intensity = beamAt.x;
    if (mote > 1.0 / 255.0) {
      intensity += mote * beamLight(beam, moteCenter).y * select(0.4, 0.75, dark);
    }
    // No light shows on the beam's own element.
    intensity *= saturate(effectElementDistance(effectElements[beam.element], page) + 0.5);
    let hot = select(0.0, smoothstep(0.35, 0.9, beamAt.x) * 0.55, dark);
    light += mix(beam.color, vec3f(1.0), hot) * intensity;
    alpha += intensity;
  }
  alpha *= clip;
  if (alpha <= 0.0) {
    return vec4f(0.0);
  }

  // Dither by up to half a step of 8 bits, so the soft edge shows no bands.
  let noise = hash3(vec2i(position.xy)).x - 0.5;
  let covered = clamp(min(alpha, 1.0) + noise / 255.0, 0.0, 1.0);
  return vec4f(min(light / alpha, vec3f(1.0)) * covered, covered);
}
`;
