import { LIQUID_SHARED_WGSL } from "./liquid-shared-wgsl.ts";
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
const FLAG_SEE_THROUGH = 2;

/**
 * One control's liquid as a frame draws it, in page coordinates and CSS px:
 * a Switch's thumb or a segmented control's indicator.
 *
 * @internal
 */
export interface LiquidInstance {
  /** Its control's index in `EffectFrame.elements` and in WGSL's `effectElements`. */
  readonly elementIndex: number;
  /** The slot of the simulation buffer that holds its particles, and how many of them are in use. */
  readonly slot: number;
  readonly particleCount: number;
  /** Its beads' range in the bead buffer. */
  readonly firstBead: number;
  readonly beadCount: number;
  /** The rest radius: half the height of the thumb or the indicator. */
  readonly radius: number;
  /** From 0 while the liquid moves to 1 once it rests in its rest shape. */
  readonly calm: number;
  /** The centre of the off position, where track space starts. */
  readonly originX: number;
  readonly originY: number;
  /** Where the centre of the rest shape is now, along the track. */
  readonly restX: number;
  /**
   * Half the length of the rest shape's straight part: the rest shape is a
   * capsule, and a thumb's is a circle, with no span.
   */
  readonly span: number;
  /** The reach of each particle, as `LiquidBody.scale` gives it. */
  readonly scale: number;
  /** How far the melted liquid spreads past its rest shape. */
  readonly spread: number;
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
  /**
   * On a track the effect does not paint, the page shows through the
   * liquid, with a glow under it this strong, from 0 to 1.
   */
  readonly underGlow?: number;
  /** The corners of the rest shape, or none for a pill. */
  readonly corner?: { readonly radius: number; readonly exponent: number };
  /** What the page shows around the track. */
  readonly backdrop: readonly [number, number, number];
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
${LIQUID_SHARED_WGSL}
const FIELD_REACH = ${FIELD_REACH.toFixed(4)};
const FIELD_THRESHOLD = ${FIELD_THRESHOLD.toFixed(3)};
const FLAG_COVER = ${String(FLAG_COVER)}u;
const FLAG_SEE_THROUGH = ${String(FLAG_SEE_THROUGH)}u;
const NECK_REACH = ${NECK_REACH.toFixed(4)};
const BEAD_JOIN = 1.0;
// The body's dome: a spherical cap this high, as a share of the radius.
const DOME = 0.85;
// The index of refraction. Water's is 1.33; higher here, so that the bend
// shows at the thumb's size.
const INDEX = 2.2;
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
// The frozen thumb is flat frost: an even fill with a grain, which goes
// from its edge's opacity to its core's in a thin band this deep, as a
// share of the radius.
const FROST_DEPTH = 0.1;
const FROST_GRAIN = 0.035;
// The glow under the on fill: how far it reaches along the track and
// across it, as a share of the radius.
const GLOW_REACH = vec2f(1.9, 1.3);
// The faint glow under a liquid in front of the page is a wide, soft wash.
const HUG_REACH = vec2f(2.4, 1.6);
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
  slot: u32,
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
  // Where the liquid rests, along the track, the centre of its mass, and
  // half the length of the rest shape's straight part.
  rest: vec4f,
  // The glow under the on fill: its colour and strength.
  glow: vec4f,
  // The frost's opacity at the core and at the edge, how plain the thumb
  // still is, and how far the melted liquid spreads.
  frost: vec4f,
  scale: f32,
  underGlow: f32,
  // The radius and the exponent of the rest shape's corners, or zero for a
  // pill.
  corner: vec2f,
}

struct Bead {
  centre: vec2f,
  radius: f32,
}

@group(2) @binding(0) var<storage, read> liquids: array<LiquidInstance>;
@group(2) @binding(1) var<storage, read> slots: array<LiquidSlot>;
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
// the centre of the liquid's mass, and less with distance along and across
// the track in rest radii.
fn underAt(liquid: LiquidInstance, page: vec2f, reachInRadii: vec2f) -> f32 {
  let reach = liquid.radius * reachInRadii;
  let fromCentre = page - liquid.origin - liquid.rest.yz;
  let toLight = vec2f(max(abs(fromCentre.x) - liquid.rest.w, 0.0), fromCentre.y) / reach;
  return exp(-dot(toLight, toLight));
}

// How far the on fill has risen at a page point: further under the liquid
// than on the rest of the track, with no edge between them.
fn risenAt(liquid: LiquidInstance, page: vec2f) -> f32 {
  let rise = liquid.off.w;
  return saturate(rise + (liquid.on.w - rise) * RISE_LEAD * underAt(liquid, page, GLOW_REACH));
}

// The fill of the track at a page point, lit from underneath where it is on.
fn fillAt(liquid: LiquidInstance, page: vec2f) -> vec3f {
  let on = risenAt(liquid, page);
  let under = underAt(liquid, page, GLOW_REACH);
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

// The particles' field at a page point, with its gradient. The particles
// are in track space: rest radii from the origin.
fn fieldAt(liquid: LiquidInstance, page: vec2f) -> vec3f {
  let reach = FIELD_REACH * liquid.radius * liquid.scale;
  let reachSquared = reach * reach;
  var value = 0.0;
  var gradient = vec2f(0.0);
  let local = page - liquid.origin;
  // No particle reaches a point beyond their extent along the track. The
  // extra pixel keeps rounding from losing a particle at its full reach.
  let extent = slots[liquid.slot].walls.zw * liquid.radius;
  if (local.x < extent.x - reach - 1.0 || local.x > extent.y + reach + 1.0) {
    return vec3f(0.0);
  }
  for (var i = 0u; i < liquid.particleCount; i += 1u) {
    let offset = local - slots[liquid.slot].particles[i].xy * liquid.radius;
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

// The distance from the rest shape: a pill, or a box with the corners of
// the control's own indicator.
fn restDistance(liquid: LiquidInstance, page: vec2f, toRest: vec2f) -> f32 {
  if (liquid.corner.y == 0.0) {
    return length(toRest) - liquid.radius;
  }
  var shape = effectElements[liquid.element];
  let half = vec2f(liquid.rest.w + liquid.radius, liquid.radius);
  shape.rect = vec4f(liquid.origin + vec2f(liquid.rest.x, 0.0) - half, 2.0 * half);
  shape.radii = vec4f(liquid.corner.x);
  shape.cornerExponent = liquid.corner.y;
  return effectElementDistance(shape, page);
}

fn bodySurface(liquid: LiquidInstance, page: vec2f) -> Surface {
  let local = page - (liquid.origin + vec2f(liquid.rest.x, 0.0));
  let toRest = local - vec2f(clamp(local.x, -liquid.rest.w, liquid.rest.w), 0.0);
  let fromCircle = restDistance(liquid, page, toRest);
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

// The frozen drop: flat ice in the thumb's colour, which scatters the track
// it lets through, so the track shows unbent.
fn frost(
  liquid: LiquidInstance,
  track: EffectElement,
  page: vec2f,
  depth: f32,
  radius: f32,
) -> vec3f {
  let opacity = mix(liquid.frost.y, liquid.frost.x, smoothstep(0.0, FROST_DEPTH * radius, depth));
  let color = mix(trackAt(liquid, track, page), liquid.thumb.rgb, opacity)
    + grain(page - liquid.origin) * FROST_GRAIN;
  // In front of the page, the control's own indicator is the plain thumb.
  let plain = select(liquid.thumb.rgb, trackAt(liquid, track, page), (liquid.flags & FLAG_SEE_THROUGH) != 0u);
  return mix(saturate(color), plain, liquid.frost.z);
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
  if (solid >= 1.0) {
    return frost(liquid, track, page, depth, radius);
  }
  let dome = domeAt(depth, radius, surface.outward);
  let normal = dome.normal;
  var behind = trackAt(liquid, track, page + dome.bend);
  let away = saturate(-dot(surface.outward, TO_LIGHT_FLAT));
  let band = (depth / radius - CAUSTIC_DEPTH) / CAUSTIC_WIDTH;
  // Water in front of the page does not darken it: it is clearer than frost.
  let dry = (liquid.flags & FLAG_SEE_THROUGH) != 0u;
  behind *= select(WET, 1.0, dry) * (1.0 + away * exp(-band * band) * CAUSTIC);
  var color = behind * (1.0 - saturate(-dot(normal.xy, TO_LIGHT.xy)) * select(SHADE, 0.0, dry));
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
  return mix(saturate(color), frost(liquid, track, page, depth, radius), solid);
}

@fragment
fn liquidFragment(input: LiquidVarying) -> @location(0) vec4f {
  let liquid = liquids[input.instance];
  let track = effectElements[liquid.element];
  let page = fragmentToPage(input.position.xy);
  let pixel = effectTarget.pixelScale.x;
  // A liquid in front of the page stays inside the track's padding box.
  let inset = select(0.0, track.rect.w * 0.5 - liquid.radius - liquid.frost.w, (liquid.flags & FLAG_SEE_THROUGH) != 0u);
  let onTrack = saturate(0.5 - (effectElementDistance(track, page) + max(inset, 0.0)) * pixel);
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
  } else {
    alpha = underAt(liquid, page, HUG_REACH) * liquid.underGlow;
    color = liquid.glow.rgb * alpha;
  }

  let spread = liquid.frost.w * melted;
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
    // The solid part is the rest shape, so that the field's bumps do not
    // show in it: about the rest place while the body is calm, and about
    // the centre of the body's mass once it moves, so the melt moves with
    // it.
    let solidCentre = mix(liquid.rest.yz, vec2f(liquid.rest.x, 0.0), liquid.calm);
    let toCentre = page - (liquid.origin + solidCentre);
    let toCore = vec2f(max(abs(toCentre.x) - liquid.rest.w, 0.0), toCentre.y);
    let inward = saturate(1.0 - length(toCore) / (liquid.radius + spread));
    let solid = solidAt(inward, firm);
    if ((liquid.flags & FLAG_SEE_THROUGH) != 0u) {
      // The liquid shows over the track as it is, and lets as much of the
      // page through as it can. Where it is lighter than the track it only
      // adds light, so a label under it keeps its contrast. It hides the
      // glow under it.
      let body = lens(liquid, track, page, surface, found.radius, solid);
      let under = trackAt(liquid, track, page);
      let ratio = body / max(under, vec3f(1e-3));
      let through = min(1.0, min(ratio.x, min(ratio.y, ratio.z)));
      color = color * (1.0 - coverage) + (body - under * through) * coverage;
      alpha = alpha * (1.0 - coverage) + (1.0 - through) * coverage;
    } else {
      let body = lens(liquid, track, page, surface, found.radius, solid);
      color = color * (1.0 - coverage) + body * coverage;
      alpha = alpha * (1.0 - coverage) + coverage;
    }
  }
  return vec4f(effectGrayscale(color, track.grayscale), alpha) * clip;
}
`;

/**
 * The byte size of one `LiquidInstance`.
 *
 * @internal
 */
export const LIQUID_INSTANCE_BYTES = 176;

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
    words[at + 1] = liquid.slot;
    words[at + 2] = liquid.particleCount;
    words[at + 3] = liquid.firstBead;
    words[at + 4] = liquid.beadCount;
    words[at + 5] =
      (liquid.cover ? FLAG_COVER : 0) |
      (liquid.underGlow === undefined ? 0 : FLAG_SEE_THROUGH);
    floats[at + 6] = liquid.radius;
    floats[at + 7] = liquid.calm;
    floats.set([liquid.originX, liquid.originY], at + 8);
    floats.set([...liquid.thumb, liquid.set], at + 12);
    floats.set([...liquid.off, liquid.rise], at + 16);
    floats.set([...liquid.on, liquid.riseGoal], at + 20);
    floats.set([...liquid.backdrop, 1], at + 24);
    floats.set(
      [liquid.restX, liquid.centreX, liquid.centreY, liquid.span],
      at + 28,
    );
    floats.set([...liquid.glow.color, liquid.glow.strength], at + 32);
    floats.set(
      [liquid.frost.core, liquid.frost.edge, liquid.plain, liquid.spread],
      at + 36,
    );
    floats[at + 40] = liquid.scale;
    floats[at + 41] = liquid.underGlow ?? 0;
    if (liquid.corner !== undefined) {
      floats.set([liquid.corner.radius, liquid.corner.exponent], at + 42);
    }
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
