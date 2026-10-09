import type { Rgb } from "./beam-color.ts";
import { MAX_OCCLUDERS } from "./lamp-occluders.ts";
import type { LampSource } from "./lamp-source.ts";
import { TARGET_WGSL } from "./target-wgsl.ts";

/**
 * The shape of a Lamp's light, in multiples of the thumb's radius and of
 * the lamp's height, and how strongly it draws on a light page. The shader
 * takes them from each instance, so one place holds them.
 *
 * @internal
 */
export const LAMP_SHAPE = {
  /** How high above the page the light sits, in thumb radii. */
  heightPerRadius: 3.5,
  /** How tall an occluder stands, as a share of the lamp's height. */
  wallPerHeight: 0.55,
  /** Half the lamp's vertical extent, in thumb radii: it softens the far end of a shadow. */
  depthPerRadius: 0.6,
  /** How far the light reaches, in lamp heights. */
  reachPerHeight: 5,
  /** The most the tint covers a light page. */
  tintAlpha: 0.34,
  /** The most a shadow darkens a light page. */
  shadowAlpha: 0.2,
} as const;

/**
 * One Lamp as the shader draws it this frame.
 *
 * @internal
 */
export interface LampInstance {
  readonly elementIndex: number;
  readonly source: LampSource;
  /** 0 off, 1 lit, a little over 1 as the light swells on. */
  readonly intensity: number;
  readonly core: Rgb;
  readonly glow: Rgb;
  readonly dark: boolean;
  /** Indices in `EffectFrame.elements`, at most `MAX_OCCLUDERS`. */
  readonly occluders: readonly number[];
}

/**
 * The shader of the Lamp effect, with each lit Lamp of the frame in group 2.
 * Each instance is one Lamp: a quad around its light out to its reach,
 * which lights each pixel as a point light above the page would, less what
 * the occluders between them hide, inside its Effect container.
 *
 * Each pixel marches from itself towards the light through the signed
 * distance field of the occluders, as far as the lowest ray from the lamp
 * clears every wall. The clearance of the ray from the nearest wall on the
 * way, against the width the lamp shows from there, gives the penumbra; the
 * height the ray has reached at the wall, against the wall's height, ends
 * the shadow a wall casts. An occluder does not shade a pixel on its own
 * face.
 *
 * @internal
 */
export const LAMP_WGSL = /* wgsl */ `${TARGET_WGSL}
const MAX_OCCLUDERS = ${String(MAX_OCCLUDERS)}u;
const MAX_STEPS = 24u;
const MIN_STEP = 1.0;
const SHADOW_INK = vec3f(0.1, 0.11, 0.17);

struct LampInstance {
  element: u32,
  occluderCount: u32,
  dark: u32,
  pad: u32,
  // The light's centre, the thumb's radius, and the lamp's height.
  light: vec4f,
  // The core colour and the intensity.
  core: vec4f,
  // The glow colour and the reach.
  glow: vec4f,
  // The wall height, the lamp's depth, the tint alpha and the shadow alpha.
  shape: vec4f,
  occluders: array<vec4u, ${String(MAX_OCCLUDERS / 4)}>,
}

@group(2) @binding(0) var<storage, read> lamps: array<LampInstance>;

struct LampVarying {
  @builtin(position) position: vec4f,
  @location(0) @interpolate(flat) instance: u32,
}

@vertex
fn lampVertex(
  @builtin(vertex_index) vertex: u32,
  @builtin(instance_index) instance: u32,
) -> LampVarying {
  let lamp = lamps[instance];
  let reach = lamp.glow.w;
  let corner = vec2f(f32(vertex & 1u), f32((vertex >> 1u) & 1u));
  let page = lamp.light.xy - reach + corner * 2.0 * reach;
  return LampVarying(pageToClip(page), instance);
}

fn occluderOf(lamp: LampInstance, index: u32) -> EffectElement {
  return effectElements[lamp.occluders[index / 4u][index % 4u]];
}

// The distance from a point to the nearest occluder, less those in skip.
fn clearance(lamp: LampInstance, point: vec2f, skip: u32) -> f32 {
  var nearest = 1e9;
  for (var index = 0u; index < lamp.occluderCount; index += 1u) {
    if ((skip & (1u << index)) == 0u) {
      nearest = min(nearest, effectElementDistance(occluderOf(lamp, index), point));
    }
  }
  return nearest;
}

// How much of the wall at a point on the way stands in the lamp's way: the
// share of the lamp's height that a ray from there has not yet risen above.
fn wallShare(lamp: LampInstance, distance: f32, along: f32) -> f32 {
  let height = lamp.light.w;
  let depth = lamp.shape.y;
  let wall = lamp.shape.x;
  return saturate((wall * distance / along - (height - depth)) / (2.0 * depth));
}

// How much of the lamp a point sees past the occluders, from 0 to 1.
fn visibility(lamp: LampInstance, point: vec2f) -> f32 {
  if (lamp.occluderCount == 0u) {
    return 1.0;
  }
  let toLight = lamp.light.xy - point;
  let distance = length(toLight);
  if (distance < 1e-3) {
    return 1.0;
  }
  let direction = toLight / distance;
  let radius = lamp.light.z;
  let height = lamp.light.w;
  let depth = lamp.shape.y;
  let wall = lamp.shape.x;
  var skip = 0u;
  for (var index = 0u; index < lamp.occluderCount; index += 1u) {
    if (effectElementDistance(occluderOf(lamp, index), point) < 0.0) {
      skip |= 1u << index;
    }
  }
  // Past this the lowest ray from the lamp is above every wall.
  let farthest = min(distance, distance * wall / max(height - depth, 1e-3));
  var shade = 0.0;
  var along = MIN_STEP;
  var previous = 1e9;
  for (var step = 0u; step < MAX_STEPS && along < farthest; step += 1u) {
    let near = clearance(lamp, point + direction * along, skip);
    if (near <= 0.0) {
      shade = max(shade, wallShare(lamp, distance, along));
      break;
    }
    if (near > farthest - along) {
      break;
    }
    // The closest approach of the ray to the wall between this step and the
    // last, from "Soft shadows in raymarched SDFs" by Inigo Quilez. Only a
    // step that comes nearer counts: on a step away from a flat face the
    // clearance doubles, and the estimate collapses to the previous step.
    if (near < previous) {
      let back = near * near / (2.0 * previous);
      let closest = sqrt(max(near * near - back * back, 0.0));
      let seen = saturate(closest * (distance - along) / (radius * max(along - back, 1e-3)));
      shade = max(shade, (1.0 - seen) * wallShare(lamp, distance, along));
    }
    previous = near;
    along += max(near, MIN_STEP);
  }
  return 1.0 - shade;
}

// Interleaved gradient noise, from "Next Generation Post Processing in Call
// of Duty: Advanced Warfare" by Jorge Jimenez.
fn dither(fragment: vec2f) -> f32 {
  return fract(52.9829189 * fract(0.06711056 * fragment.x + 0.00583715 * fragment.y)) - 0.5;
}

@fragment
fn lampFragment(input: LampVarying) -> @location(0) vec4f {
  let lamp = lamps[input.instance];
  let element = effectElements[lamp.element];
  let page = fragmentToPage(input.position.xy);
  let offset = page - lamp.light.xy;
  let spread = length(offset);
  let reach = lamp.glow.w;
  if (spread >= reach) {
    return vec4f(0.0);
  }
  let clip = effectClip(element.scope, page);
  if (clip <= 0.0) {
    return vec4f(0.0);
  }
  let radius = lamp.light.z;
  let height = lamp.light.w;
  let intensity = lamp.core.w;
  // The irradiance of the page from a point light above it, 1 right under
  // the lamp, which the thumb itself covers.
  let squaredHeight = height * height;
  var falloff = pow(squaredHeight / (spread * spread + squaredHeight), 1.5);
  falloff *= 1.0 - smoothstep(reach * 0.45, reach, spread);
  falloff *= smoothstep(radius * 0.5, radius * 1.15, spread);
  let seen = visibility(lamp, page);
  // The switch's own track keeps its colour: the light over it is held
  // back, so the thumb keeps its contrast against it.
  let own = effectElementDistance(element, page) < 0.0;
  let bulb = 1.0 - smoothstep(radius * 0.88, radius * 1.0, spread);
  // The bloom on the thumb's rim.
  let rim = (spread - radius) / (radius * 0.75);
  let halo = exp(-rim * rim) * select(1.0, 0.25, own);

  var color = vec3f(0.0);
  var alpha = 0.0;
  if (lamp.dark != 0u) {
    let pool = falloff * seen * select(1.7, 0.2, own);
    let light = (pool + halo * 0.9 + bulb * 3.0) * intensity;
    alpha = 1.0 - exp(-light);
    color = mix(lamp.glow.rgb, lamp.core.rgb, smoothstep(0.15, 1.1, light));
  } else {
    let pool = falloff * seen * select(2.4, 0.6, own);
    let light = (pool + halo * 1.2 + bulb * 0.35) * intensity;
    let tint = lamp.shape.z * (1.0 - exp(-light));
    let shadow = lamp.shape.w * min(falloff * 3.0, 1.0) * (1.0 - seen) * min(intensity, 1.0);
    let tinted = mix(lamp.glow.rgb, lamp.core.rgb, smoothstep(0.1, 1.2, light));
    // The tint over the shadow.
    alpha = shadow + tint * (1.0 - shadow);
    color = (SHADOW_INK * shadow * (1.0 - tint) + tinted * tint) / max(alpha, 1e-4);
  }
  alpha *= clip;
  if (alpha <= 0.0) {
    return vec4f(0.0);
  }
  // Dither by up to half a step of 8 bits, so the soft light shows no bands.
  let covered = clamp(alpha + dither(input.position.xy) / 255.0, 0.0, 1.0);
  return vec4f(color * covered, covered);
}
`;

/**
 * The byte size of one `LampInstance`.
 *
 * @internal
 */
export const LAMP_INSTANCE_BYTES = 112;

const INSTANCE_WORDS = LAMP_INSTANCE_BYTES / 4;

/**
 * Packs the instances in order as `LampInstance` structs at the start of
 * `buffer`, which must hold at least that many.
 *
 * @internal
 */
export function packLampInstances(
  instances: readonly LampInstance[],
  buffer: ArrayBuffer,
) {
  const floats = new Float32Array(buffer);
  const words = new Uint32Array(buffer);
  for (const [index, instance] of instances.entries()) {
    const at = index * INSTANCE_WORDS;
    const { source, occluders } = instance;
    const height = source.radius * LAMP_SHAPE.heightPerRadius;
    words.fill(0, at, at + INSTANCE_WORDS);
    words[at] = instance.elementIndex;
    words[at + 1] = occluders.length;
    words[at + 2] = instance.dark ? 1 : 0;
    floats.set([source.x, source.y, source.radius, height], at + 4);
    floats.set([...instance.core, instance.intensity], at + 8);
    floats.set([...instance.glow, height * LAMP_SHAPE.reachPerHeight], at + 12);
    floats.set(
      [
        height * LAMP_SHAPE.wallPerHeight,
        source.radius * LAMP_SHAPE.depthPerRadius,
        LAMP_SHAPE.tintAlpha,
        LAMP_SHAPE.shadowAlpha,
      ],
      at + 16,
    );
    words.set(occluders, at + 20);
  }
}

/**
 * How far a Lamp's light reaches from its source, in CSS px.
 *
 * @internal
 */
export function lampReach(source: LampSource) {
  return source.radius * LAMP_SHAPE.heightPerRadius * LAMP_SHAPE.reachPerHeight;
}
