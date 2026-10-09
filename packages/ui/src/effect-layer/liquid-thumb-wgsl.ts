import { TARGET_WGSL } from "./target-wgsl.ts";

const FLAG_DROPLET = 1;
const FLAG_TRAIL = 2;

/**
 * One drop of liquid as a frame draws it, in page coordinates and CSS px.
 *
 * @internal
 */
export interface LiquidInstance {
  /** Its Switch's index in `EffectFrame.elements` and in WGSL's `effectElements`. */
  readonly elementIndex: number;
  /** The thumb's rest radius. */
  readonly radius: number;
  /** The Switch's computed `opacity`, so a disabled one draws as dim. */
  readonly opacity: number;
  /** The drop's centre. */
  readonly x: number;
  readonly y: number;
  /** How much wider and taller than its rest diameter the drop is. */
  readonly scaleX: number;
  readonly scaleY: number;
  /** The blob of liquid that reaches for a dragging pointer, or `null`. */
  readonly pull: {
    readonly x: number;
    readonly y: number;
    readonly radius: number;
  } | null;
  readonly droplet: {
    readonly x: number;
    readonly y: number;
    readonly radius: number;
  } | null;
  /** The wet trail, from where the drop set off to where it is. */
  readonly trail: {
    readonly fromX: number;
    readonly toX: number;
    readonly y: number;
    readonly wet: number;
  } | null;
  /** The thumb's colour, sRGB-encoded. */
  readonly color: readonly [number, number, number];
  /** How far the drop has lifted under the pointer, from 0 to 1. */
  readonly lift: number;
}

/**
 * The render shader of the Liquid thumb effect, with each drop this frame in
 * group 2. Each instance is one Switch: a quad over its track, which draws
 * the drop as a signed distance field — the drop, the blob that reaches for
 * the pointer and the droplet blended into one surface — lit as a bead of
 * liquid, over its wet trail and the shadow it casts when lifted, and clipped
 * to the track.
 *
 * @internal
 */
export const LIQUID_THUMB_WGSL = /* wgsl */ `${TARGET_WGSL}
const FLAG_DROPLET = ${String(FLAG_DROPLET)}u;
const FLAG_TRAIL = ${String(FLAG_TRAIL)}u;
// The drop stays this far inside the track's edge, over the padding.
const EDGE_INSET = 0.5;
const SHADOW_OFFSET = 2.5;
const SHADOW_REACH = 5.0;
const SHADOW_ALPHA = 0.3;
const TRAIL_ALPHA = 0.12;
const TRAIL_WIDTH = 0.3;
const RIM_TINT = 0.42;
const SHADE_TINT = 0.14;
const SHININESS = 90.0;
const GLOSS = 12.0;

struct LiquidInstance {
  element: u32,
  flags: u32,
  radius: f32,
  opacity: f32,
  // The centre, and the scale along and across the travel.
  drop: vec4f,
  // The pull blob's centre and radius, and the blend between the two.
  pull: vec4f,
  // The droplet's centre and radius.
  droplet: vec4f,
  // The trail's start and end along the travel, its centre line, and how wet it is.
  trail: vec4f,
  // The thumb's colour, and how far the drop has lifted.
  color: vec4f,
}

@group(2) @binding(0) var<storage, read> liquids: array<LiquidInstance>;

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

// The polynomial smooth minimum: two surfaces that merge into one where they
// come within k of each other, the way two drops of liquid join.
fn smoothMin(a: f32, b: f32, k: f32) -> f32 {
  let h = max(k - abs(a - b), 0.0) / max(k, 1e-4);
  return min(a, b) - h * h * k * 0.25;
}

fn capsuleDistance(page: vec2f, a: vec2f, b: vec2f, radius: f32) -> f32 {
  let ab = b - a;
  let along = saturate(dot(page - a, ab) / max(dot(ab, ab), 1e-4));
  return length(page - a - ab * along) - radius;
}

fn liquidDistance(liquid: LiquidInstance, page: vec2f) -> f32 {
  let scale = liquid.drop.zw;
  let local = (page - liquid.drop.xy) / scale;
  var distance = (length(local) - liquid.radius) * min(scale.x, scale.y);
  if (liquid.pull.z > 0.0) {
    let pull = length(page - liquid.pull.xy) - liquid.pull.z;
    distance = smoothMin(distance, pull, liquid.pull.w);
  }
  if ((liquid.flags & FLAG_DROPLET) != 0u) {
    let droplet = length(page - liquid.droplet.xy) - liquid.droplet.z;
    distance = smoothMin(distance, droplet, liquid.radius * 0.3);
  }
  return distance;
}

fn luminance(color: vec3f) -> f32 {
  return dot(color, vec3f(0.2126, 0.7152, 0.0722));
}

@fragment
fn liquidFragment(input: LiquidVarying) -> @location(0) vec4f {
  let liquid = liquids[input.instance];
  let track = effectElements[liquid.element];
  let page = fragmentToPage(input.position.xy);
  let pixel = effectTarget.pixelScale.x;
  let inside = saturate(0.5 - (effectElementDistance(track, page) + EDGE_INSET) * pixel);
  if (inside <= 0.0) {
    return vec4f(0.0);
  }
  let clip = inside * effectClip(track.scope, page) * liquid.opacity;
  let radius = liquid.radius;
  let distance = liquidDistance(liquid, page);
  let coverage = saturate(0.5 - distance * pixel);

  // The surface as a bead: its normal tilts out towards the edge like a
  // sphere's, along the gradient of the distance field.
  let step = vec2f(0.5, 0.0);
  let gradient = vec2f(
    liquidDistance(liquid, page + step.xy) - liquidDistance(liquid, page - step.xy),
    liquidDistance(liquid, page + step.yx) - liquidDistance(liquid, page - step.yx),
  );
  let outward = gradient / max(length(gradient), 1e-4);
  let slope = 1.0 - saturate(-distance / radius);
  let normal = normalize(vec3f(outward * slope, sqrt(max(1.0 - slope * slope, 0.0)) + 0.02));
  let light = normalize(vec3f(-0.45, -0.6, 0.72));
  let halfway = normalize(light + vec3f(0.0, 0.0, 1.0));
  let lit = max(dot(normal, halfway), 0.0);
  let specular = pow(lit, SHININESS) + 0.3 * pow(lit, GLOSS);
  let fresnel = pow(1.0 - normal.z, 2.8);

  let thumb = liquid.color.rgb;
  let trackColor = track.fill.rgb;
  let bright = luminance(thumb) > 0.5;
  // A bright drop shades away from the light; a dark one catches it on its
  // lit side, where the track shows through its rim.
  let shadeFrom = select(vec2f(-0.45, -0.89), vec2f(0.45, 0.89), bright);
  let shade = saturate(dot(normal.xy, shadeFrom));
  var body = mix(thumb, trackColor, fresnel * RIM_TINT + shade * SHADE_TINT);
  let highlight = select(mix(thumb, vec3f(1.0), 0.8), vec3f(1.0), bright);
  body = mix(body, highlight, saturate(specular) * select(0.7, 1.0, bright));

  var color = vec3f(0.0);
  var alpha = 0.0;
  if ((liquid.flags & FLAG_TRAIL) != 0u) {
    let trail = liquid.trail;
    let start = vec2f(min(trail.x, trail.y), trail.z);
    let end = vec2f(max(trail.x, trail.y), trail.z);
    let width = radius * TRAIL_WIDTH;
    let edge = capsuleDistance(page, start, end, width);
    let wet = (1.0 - smoothstep(-width, 0.0, edge)) * trail.w * TRAIL_ALPHA;
    color = thumb * wet;
    alpha = wet;
  }
  let lift = liquid.color.w;
  if (lift > 0.001) {
    let under = liquidDistance(liquid, page - vec2f(0.0, SHADOW_OFFSET * lift));
    let shadow = (1.0 - smoothstep(-1.0, SHADOW_REACH, under)) * SHADOW_ALPHA * lift;
    color *= 1.0 - shadow;
    alpha += shadow * (1.0 - alpha);
  }
  color = color * (1.0 - coverage) + body * coverage;
  alpha = alpha * (1.0 - coverage) + coverage;
  return vec4f(color, alpha) * clip;
}
`;

/**
 * The byte size of one `LiquidInstance`.
 *
 * @internal
 */
export const LIQUID_INSTANCE_BYTES = 96;

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
    const { pull, droplet, trail } = liquid;
    words.fill(0, at, at + INSTANCE_WORDS);
    words[at] = liquid.elementIndex;
    words[at + 1] =
      (droplet === null ? 0 : FLAG_DROPLET) | (trail === null ? 0 : FLAG_TRAIL);
    floats[at + 2] = liquid.radius;
    floats[at + 3] = liquid.opacity;
    floats.set([liquid.x, liquid.y, liquid.scaleX, liquid.scaleY], at + 4);
    if (pull !== null) {
      floats.set([pull.x, pull.y, pull.radius, liquid.radius * 0.9], at + 8);
    }
    if (droplet !== null) {
      floats.set([droplet.x, droplet.y, droplet.radius], at + 12);
    }
    if (trail !== null) {
      floats.set([trail.fromX, trail.toX, trail.y, trail.wet], at + 16);
    }
    floats.set([...liquid.color, liquid.lift], at + 20);
  }
}
