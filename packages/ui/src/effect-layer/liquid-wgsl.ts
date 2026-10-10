import { KERNEL_REACH, NECK_REACH } from "./step-liquid.ts";
import { TARGET_WGSL } from "./target-wgsl.ts";

/**
 * The reach of a particle in the drawn field, as a share of the rest
 * radius: wider than the simulation's, so that the surface is smooth.
 */
const FIELD_REACH = KERNEL_REACH * 1.5;
/**
 * The field's value on the surface: where the liquid at rest has the
 * thumb's radius, measured on the simulation's rest state.
 */
const FIELD_THRESHOLD = 9.93;

const FLAG_COVER = 1;

/**
 * One Switch's liquid as a frame draws it, in page coordinates and CSS px.
 *
 * @internal
 */
export interface LiquidInstance {
  /** Its Switch's index in `EffectFrame.elements` and in WGSL's `effectElements`. */
  readonly elementIndex: number;
  /** Its particles' range in the particle buffer. */
  readonly firstParticle: number;
  readonly particleCount: number;
  /** Its beads' range in the bead buffer. */
  readonly firstBead: number;
  readonly beadCount: number;
  /** The thumb's rest radius. */
  readonly radius: number;
  /** From 0 while the liquid moves to 1 once it rests as the thumb's circle. */
  readonly calm: number;
  /** The centre of the off position, where track space starts. */
  readonly originX: number;
  readonly originY: number;
  /** Where the liquid rests now, along the travel. */
  readonly restX: number;
  /** The centre of the liquid's mass, in track space and CSS px. */
  readonly centreX: number;
  readonly centreY: number;
  /** The thumb's colour, sRGB-encoded. */
  readonly thumb: readonly [number, number, number];
  /** How frozen the thumb is, from 0 as clear water to 1 as frosted ice. */
  readonly set: number;
  /**
   * How much the drawn thumb is still the plain thumb the Switch draws,
   * from 1 when the effect takes over to 0 once it has frozen into ice.
   */
  readonly plain: number;
  /** How opaque the frozen thumb is, at its core and at its edge. */
  readonly frost: { readonly core: number; readonly edge: number };
  /**
   * The track's off fill and its on fill. The on fill and the glow are dim
   * under the clear liquid and brighten as it freezes.
   */
  readonly off: readonly [number, number, number];
  readonly on: readonly [number, number, number];
  /**
   * How far the on fill has risen through the track, from 0 off to 1 on,
   * and how far it rises to.
   */
  readonly rise: number;
  readonly riseGoal: number;
  /** The effect paints the track, not only the liquid. */
  readonly cover: boolean;
  /**
   * The glow under the on fill: its colour under the centre of the liquid,
   * and its strength, from 0 to 1.
   */
  readonly glow: {
    readonly color: readonly [number, number, number];
    readonly strength: number;
  };
  /** What the page shows around the track. */
  readonly backdrop: readonly [number, number, number];
}

/**
 * One particle of liquid, in page coordinates.
 *
 * @internal
 */
export interface LiquidParticle {
  readonly x: number;
  readonly y: number;
}

/**
 * One bead on the track, in page coordinates and CSS px.
 *
 * @internal
 */
export interface LiquidBeadInstance {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}

/**
 * The render shader of the Liquid effect, with each Switch's liquid this
 * frame in group 2. Each instance is one Switch: a quad over its track. It
 * paints the track while any of it is on: the on fill rises through the
 * off fill as a glow from underneath, ahead under the liquid, and stays lit
 * under the liquid at rest. Then it paints the liquid as water: the field of
 * the particles gives the body its surface, which a smooth union joins to
 * each bead's, so a bead swells out of the body and pinches off on a neck,
 * and joins it again the same way. A dome over that surface bends what the
 * track shows through it, and the dome's slope lights it with a thin rim, a
 * highlight and a caustic. As far as the body has set it is frozen:
 * frosted ice in the thumb's colour, which lets a little of the track
 * through and keeps the thumb's circle.
 *
 * @internal
 */
export const LIQUID_WGSL = /* wgsl */ `${TARGET_WGSL}
const FIELD_REACH = ${FIELD_REACH.toFixed(4)};
const FIELD_THRESHOLD = ${FIELD_THRESHOLD.toFixed(3)};
const FLAG_COVER = ${String(FLAG_COVER)}u;
const NECK_REACH = ${NECK_REACH.toFixed(4)};
const BEAD_JOIN = 1.0;
// The body's dome: a spherical cap this high, as a share of the radius.
const DOME = 0.85;
// The index of refraction. Water's is 1.33; higher here, so that the bend
// shows at the thumb's size.
const INDEX = 2.2;
// The melted body spreads this far past the thumb's circle, in CSS px:
// out to the track's edge.
const SPREAD = 2.0;
// The rim: the steep surface reflects the room, brightest at the edge.
const RIM_LIGHT = 0.9;
const RIM_POWER = 12.0;
// The contact line: a thin dark line where the surface meets the track.
const LIMB = 0.22;
const LIMB_WIDTH = 1.0;
const HIGHLIGHT = 1.0;
const GLEAM = 0.22;
// The caustic: light the dome gathers onto the track on the side away
// from the light, in a band this far inside the rim, as a share of the
// radius.
const CAUSTIC = 0.3;
const CAUSTIC_DEPTH = 0.14;
const CAUSTIC_WIDTH = 0.08;
// The track seen through the body: a wet surface is a little darker.
const WET = 0.95;
const SHADE = 0.05;
const SHADOW_REACH = 3.0;
const SHADOW = 0.18;
// The thumb thaws from the rim inward and freezes from the centre out, with
// an edge this wide as a share of the radius.
const MELT_WIDTH = 0.6;
// The frozen thumb: how far in, as a share of the radius, the frost goes
// from its edge's opacity to its core's; a soft sheen on the side towards
// the light and a soft rim, which a light thumb takes and a dark one does
// not; a broad, dim gloss; and a grain.
const FROST_DEPTH = 0.45;
const FROST_SHEEN = 0.16;
const FROST_RIM = 0.3;
const FROST_RIM_POWER = 3.0;
const FROST_GLOSS = 0.18;
const FROST_GRAIN = 0.035;
// The glow under the on fill: how far it reaches along the track and
// across it, as a share of the radius.
const GLOW_ALONG = 1.9;
const GLOW_ACROSS = 1.3;
// How far ahead of the rest of the track the on fill rises under the
// liquid, so that the glow blooms out from under it.
const RISE_LEAD = 0.6;
// The track's edge as it shows through the liquid, darker than the fill.
const EDGE_SHADE = 0.3;
const TO_LIGHT = normalize(vec3f(-0.42, -0.66, 0.62));
const TO_LIGHT_FLAT = normalize(TO_LIGHT.xy);
const HALFWAY = normalize(TO_LIGHT + vec3f(0.0, 0.0, 1.0));
const GLEAM_HALFWAY = normalize(vec3f(-TO_LIGHT.xy, TO_LIGHT.z) + vec3f(0.0, 0.0, 1.0));

struct LiquidInstance {
  element: u32,
  firstParticle: u32,
  particleCount: u32,
  firstBead: u32,
  beadCount: u32,
  flags: u32,
  radius: f32,
  calm: f32,
  // The centre of the off position.
  origin: vec2f,
  // The thumb's colour and how solid the thumb is.
  thumb: vec4f,
  // The off fill and how far the on fill has risen, then the on fill and
  // how far it rises to.
  off: vec4f,
  on: vec4f,
  backdrop: vec4f,
  // Where the liquid rests, along the travel, and the centre of its mass.
  rest: vec4f,
  // The glow under the on fill: its colour and strength.
  glow: vec4f,
  // The frost's opacity at the core and at the edge, and how plain the
  // thumb still is.
  frost: vec4f,
}

struct Bead {
  centre: vec2f,
  radius: f32,
}

@group(2) @binding(0) var<storage, read> liquids: array<LiquidInstance>;
@group(2) @binding(1) var<storage, read> particles: array<vec2f>;
@group(2) @binding(2) var<storage, read> beads: array<Bead>;

struct LiquidVarying {
  @builtin(position) position: vec4f,
  @location(0) @interpolate(flat) instance: u32,
}

@vertex
fn liquidVertex(
  @builtin(vertex_index) vertex: u32,
  @builtin(instance_index) instance: u32,
) -> LiquidVarying {
  let element = effectElements[liquids[instance].element];
  let corner = vec2f(f32(vertex & 1u), f32((vertex >> 1u) & 1u));
  return LiquidVarying(pageToClip(element.rect.xy + corner * element.rect.zw), instance);
}

// How much of the light under the liquid reaches a page point: 1 under
// the centre of the liquid's mass, and less with distance.
fn underAt(liquid: LiquidInstance, page: vec2f) -> f32 {
  let reach = liquid.radius * vec2f(GLOW_ALONG, GLOW_ACROSS);
  let toLight = (page - liquid.origin - liquid.rest.yz) / reach;
  return exp(-dot(toLight, toLight));
}

// How far the on fill has risen at a page point: further under the liquid
// than on the rest of the track, with no edge between them.
fn risenAt(liquid: LiquidInstance, page: vec2f) -> f32 {
  let rise = liquid.off.w;
  return saturate(rise + (liquid.on.w - rise) * RISE_LEAD * underAt(liquid, page));
}

// The fill of the track at a page point, lit from underneath where it is on.
fn fillAt(liquid: LiquidInstance, page: vec2f) -> vec3f {
  let on = risenAt(liquid, page);
  let under = underAt(liquid, page);
  let fill = mix(liquid.off.rgb, liquid.on.rgb, on);
  return mix(fill, liquid.glow.rgb, under * liquid.glow.w * on);
}

// The colour of the track at a page point, as the liquid sees it.
fn trackAt(liquid: LiquidInstance, track: EffectElement, page: vec2f) -> vec3f {
  let edge = effectElementDistance(track, page);
  let fill = fillAt(liquid, page);
  let shaded = mix(fill, liquid.backdrop.rgb, EDGE_SHADE);
  let rim = smoothstep(-1.5, 0.0, edge);
  return mix(mix(fill, shaded, rim), liquid.backdrop.rgb, smoothstep(0.0, 1.0, edge));
}

// The particles' field at a page point, with its gradient.
fn fieldAt(liquid: LiquidInstance, page: vec2f) -> vec3f {
  let reach = FIELD_REACH * liquid.radius;
  let reachSquared = reach * reach;
  var value = 0.0;
  var gradient = vec2f(0.0);
  for (var i = liquid.firstParticle; i < liquid.firstParticle + liquid.particleCount; i += 1u) {
    let offset = page - particles[i];
    let distanceSquared = dot(offset, offset);
    if (distanceSquared < reachSquared) {
      let q = 1.0 - distanceSquared / reachSquared;
      value += q * q;
      gradient -= 4.0 * q * offset / reachSquared;
    }
  }
  return vec3f(value, gradient);
}

struct Surface {
  // Below zero inside, in CSS px.
  distance: f32,
  outward: vec2f,
}

fn bodySurface(liquid: LiquidInstance, page: vec2f) -> Surface {
  let toRest = page - (liquid.origin + vec2f(liquid.rest.x, 0.0));
  let fromCircle = length(toRest) - liquid.radius;
  let circleOutward = toRest / max(length(toRest), 1e-4);
  let calm = liquid.calm;
  if (calm >= 1.0) {
    return Surface(fromCircle, normalize(circleOutward + vec2f(1e-5, 0.0)));
  }
  let field = fieldAt(liquid, page);
  let slope = max(length(field.yz), 1e-4);
  let fromField = (FIELD_THRESHOLD - field.x) / slope;
  var outward = -field.yz / slope;
  if (field.x <= 0.0) {
    outward = vec2f(0.0);
  }
  // Where the field peaks its slope is near zero and the distance from it
  // runs away, so it is held to the radius, where the dome is flat anyway.
  let far = select(fromField, liquid.radius, field.x <= 0.0);
  return Surface(
    mix(clamp(far, -liquid.radius, liquid.radius), fromCircle, calm),
    normalize(mix(outward, circleOutward, calm) + vec2f(1e-5, 0.0)),
  );
}

// The liquid's surface: the body's, joined to the beads' by a smooth union,
// with the radius of the dome over it, which runs from the body's to a
// bead's through the neck between them. Beads that touch join each other
// only a little, so that they do not run together into one lobe.
struct Liquid {
  surface: Surface,
  radius: f32,
}

fn liquidSurface(liquid: LiquidInstance, page: vec2f, spread: f32) -> Liquid {
  var distance = 1e4;
  var outward = vec2f(0.0);
  var radius = 0.0;
  var reach = 1e-4;
  for (var i = liquid.firstBead; i < liquid.firstBead + liquid.beadCount; i += 1u) {
    let bead = beads[i];
    let toBead = page - bead.centre;
    let beadDistance = length(toBead) - bead.radius;
    let join = max(BEAD_JOIN * bead.radius, 1e-4);
    let kept = saturate(0.5 + 0.5 * (beadDistance - distance) / join);
    distance = mix(beadDistance, distance, kept) - join * kept * (1.0 - kept);
    outward = mix(toBead / max(length(toBead), 1e-4), outward, kept);
    radius = mix(bead.radius, radius, kept);
    reach = mix(max(NECK_REACH * bead.radius, 1e-4), reach, kept);
  }
  let body = bodySurface(liquid, page);
  let bodyDistance = body.distance - spread;
  let kept = saturate(0.5 + 0.5 * (distance - bodyDistance) / reach);
  return Liquid(
    Surface(
      mix(distance, bodyDistance, kept) - reach * kept * (1.0 - kept),
      normalize(mix(outward, body.outward, kept) + vec2f(1e-5, 0.0)),
    ),
    mix(radius, liquid.radius + spread, kept),
  );
}

// The dome of water over a point depth inside the surface of a body of
// radius: a spherical cap, with the way light takes through it.
struct Dome {
  normal: vec3f,
  // Where the light that leaves this point for the eye came through the
  // track, from this point: the ray bends towards the normal as it enters
  // the water, so the track shows magnified.
  bend: vec2f,
  // The water's height here, as a share of the dome's.
  height: f32,
  // How much of the room the surface reflects here: 1 at the rim.
  rim: f32,
}

fn domeAt(depth: f32, radius: f32, outward: vec2f) -> Dome {
  let top = DOME * radius;
  let sphere = (radius * radius + top * top) / (2.0 * top);
  let r = clamp(radius - depth, 0.0, radius);
  let height = sqrt(max(sphere * sphere - r * r, 0.0)) - (sphere - top);
  let sinTheta = r / sphere;
  let cosTheta = sqrt(1.0 - sinTheta * sinTheta);
  let cosRim = sqrt(1.0 - (radius * radius) / (sphere * sphere));
  let theta = asin(sinTheta);
  let phi = asin(sinTheta / INDEX);
  return Dome(
    vec3f(outward * sinTheta, cosTheta),
    -outward * height * tan(theta - phi),
    height / top,
    pow((1.0 - cosTheta) / (1.0 - cosRim), RIM_POWER),
  );
}

// How frozen a point this far into the body is, from 0 at the rim to 1 at
// the centre, as the body sets: the thumb thaws from the rim inward and
// freezes from the centre out.
fn solidAt(inward: f32, firm: f32) -> f32 {
  let threshold = (1.0 - firm) * (1.0 + MELT_WIDTH) - MELT_WIDTH;
  return smoothstep(threshold, threshold + MELT_WIDTH, inward);
}

fn grain(page: vec2f) -> f32 {
  return fract(sin(dot(floor(page), vec2f(12.9898, 78.233))) * 43758.5453) - 0.5;
}

// The frozen drop: ice in the thumb's colour, which scatters the track it
// lets through, so the track shows unbent, and which is lit diffusely.
fn frost(
  liquid: LiquidInstance,
  track: EffectElement,
  page: vec2f,
  depth: f32,
  radius: f32,
  dome: Dome,
) -> vec3f {
  let opacity = mix(liquid.frost.y, liquid.frost.x, smoothstep(0.0, FROST_DEPTH * radius, depth));
  var color = mix(trackAt(liquid, track, page), liquid.thumb.rgb, opacity);
  // A dark thumb that took the sheen and the rim would lose its contrast.
  let pale = dot(liquid.thumb.rgb, vec3f(0.2126, 0.7152, 0.0722));
  let towards = saturate(dot(dome.normal.xy, TO_LIGHT_FLAT));
  color = mix(color, vec3f(1.0), towards * FROST_SHEEN * pale);
  let rim = pow(dome.rim, FROST_RIM_POWER / RIM_POWER);
  color = mix(color, vec3f(1.0), rim * FROST_RIM * pale);
  let gloss = pow(max(dot(dome.normal, HALFWAY), 0.0), 10.0);
  color = mix(color, vec3f(1.0), gloss * FROST_GLOSS * mix(0.4, 1.0, pale));
  color += grain(page - liquid.origin) * FROST_GRAIN;
  return mix(saturate(color), liquid.thumb.rgb, liquid.frost.z);
}

// A drop of water over the track: the track as it shows through the dome,
// lit by a thin rim, a highlight and a caustic, and frozen as far as it has
// set.
fn lens(
  liquid: LiquidInstance,
  track: EffectElement,
  page: vec2f,
  surface: Surface,
  radius: f32,
  solid: f32,
) -> vec3f {
  let depth = -surface.distance;
  let dome = domeAt(depth, radius, surface.outward);
  if (solid >= 1.0) {
    return frost(liquid, track, page, depth, radius, dome);
  }
  let normal = dome.normal;
  var behind = trackAt(liquid, track, page + dome.bend);
  let away = saturate(-dot(surface.outward, TO_LIGHT_FLAT));
  let band = (depth / radius - CAUSTIC_DEPTH) / CAUSTIC_WIDTH;
  behind *= WET * (1.0 + away * exp(-band * band) * CAUSTIC);
  var color = behind * (1.0 - saturate(-dot(normal.xy, TO_LIGHT.xy)) * SHADE);
  color *= 1.0 - LIMB * (1.0 - smoothstep(0.0, LIMB_WIDTH, depth));
  color = mix(color, vec3f(1.0), dome.rim * RIM_LIGHT);
  let lit = max(dot(normal, HALFWAY), 0.0);
  let highlight = pow(lit, 120.0) + 0.05 * pow(lit, 16.0);
  color = mix(color, vec3f(1.0), saturate(highlight) * HIGHLIGHT);
  // A second, fainter gleam on the far side: the room reflected.
  let gleam = pow(max(dot(normal, GLEAM_HALFWAY), 0.0), 40.0);
  color = mix(color, vec3f(1.0), gleam * GLEAM);
  if (solid <= 0.0) {
    return saturate(color);
  }
  return mix(saturate(color), frost(liquid, track, page, depth, radius, dome), solid);
}

@fragment
fn liquidFragment(input: LiquidVarying) -> @location(0) vec4f {
  let liquid = liquids[input.instance];
  let track = effectElements[liquid.element];
  let page = fragmentToPage(input.position.xy);
  let pixel = effectTarget.pixelScale.x;
  let onTrack = saturate(0.5 - effectElementDistance(track, page) * pixel);
  if (onTrack <= 0.0) {
    return vec4f(0.0);
  }
  let clip = onTrack * effectClip(track.scope, page);
  let firm = liquid.thumb.w;
  let melted = 1.0 - firm;

  var color = vec3f(0.0);
  var alpha = 0.0;
  if ((liquid.flags & FLAG_COVER) != 0u) {
    color = fillAt(liquid, page);
    alpha = 1.0;
  }

  let spread = SPREAD * melted;
  let found = liquidSurface(liquid, page, spread);
  let surface = found.surface;
  let coverage = saturate(0.5 - surface.distance * pixel);

  // A contact shadow, deeper on the side away from the light, which the
  // plain thumb does not cast.
  let lee = 0.5 - 0.5 * dot(surface.outward, TO_LIGHT.xy);
  let shadow = (1.0 - smoothstep(0.0, SHADOW_REACH, surface.distance)) * (1.0 - coverage) * lee * SHADOW * melted;
  color *= 1.0 - shadow;
  alpha += shadow * (1.0 - alpha);

  if (coverage > 0.0) {
    // The solid part is a disc, so that the field's bumps do not show in
    // it: about the thumb's centre while the body is calm, and about the
    // centre of the body's mass once it moves, so the melt moves with it.
    let solidCentre = mix(liquid.rest.yz, vec2f(liquid.rest.x, 0.0), liquid.calm);
    let toCentre = page - (liquid.origin + solidCentre);
    let inward = saturate(1.0 - length(toCentre) / (liquid.radius + spread));
    let body = lens(liquid, track, page, surface, found.radius, solidAt(inward, firm));
    color = color * (1.0 - coverage) + body * coverage;
    alpha = alpha * (1.0 - coverage) + coverage;
  }
  return vec4f(effectGrayscale(color, track.grayscale), alpha) * clip;
}
`;

/**
 * The byte size of one `LiquidInstance`.
 *
 * @internal
 */
export const LIQUID_INSTANCE_BYTES = 160;

const INSTANCE_WORDS = LIQUID_INSTANCE_BYTES / 4;

/**
 * Packs the instances in order as `LiquidInstance` structs at the start of
 * `buffer`, which must hold at least that many.
 *
 * @internal
 */
export function packLiquidInstances(
  instances: readonly LiquidInstance[],
  buffer: ArrayBuffer,
) {
  const floats = new Float32Array(buffer);
  const words = new Uint32Array(buffer);
  for (const [index, liquid] of instances.entries()) {
    const at = index * INSTANCE_WORDS;
    words.fill(0, at, at + INSTANCE_WORDS);
    words[at] = liquid.elementIndex;
    words[at + 1] = liquid.firstParticle;
    words[at + 2] = liquid.particleCount;
    words[at + 3] = liquid.firstBead;
    words[at + 4] = liquid.beadCount;
    words[at + 5] = liquid.cover ? FLAG_COVER : 0;
    floats[at + 6] = liquid.radius;
    floats[at + 7] = liquid.calm;
    floats.set([liquid.originX, liquid.originY], at + 8);
    floats.set([...liquid.thumb, liquid.set], at + 12);
    floats.set([...liquid.off, liquid.rise], at + 16);
    floats.set([...liquid.on, liquid.riseGoal], at + 20);
    floats.set([...liquid.backdrop, 1], at + 24);
    floats.set([liquid.restX, liquid.centreX, liquid.centreY], at + 28);
    floats.set([...liquid.glow.color, liquid.glow.strength], at + 32);
    floats.set([liquid.frost.core, liquid.frost.edge, liquid.plain], at + 36);
  }
}

/**
 * Packs the particles as `vec2f` at the start of `buffer`.
 *
 * @internal
 */
export function packLiquidParticles(
  particles: readonly LiquidParticle[],
  buffer: ArrayBuffer,
) {
  const floats = new Float32Array(buffer);
  for (const [index, particle] of particles.entries()) {
    floats[index * 2] = particle.x;
    floats[index * 2 + 1] = particle.y;
  }
}

/**
 * Packs the beads as `Bead` structs at the start of `buffer`.
 *
 * @internal
 */
export function packLiquidBeads(
  beads: readonly LiquidBeadInstance[],
  buffer: ArrayBuffer,
) {
  const floats = new Float32Array(buffer);
  for (const [index, bead] of beads.entries()) {
    floats.set([bead.x, bead.y, bead.radius, 0], index * 4);
  }
}
