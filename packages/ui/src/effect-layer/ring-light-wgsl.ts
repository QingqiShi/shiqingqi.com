import type { EffectColor } from "./parse-css-color.ts";
import type { RingLightState } from "./ring-light-at.ts";
import { TARGET_WGSL } from "./target-wgsl.ts";

/** The half width of a comet's core at its head, in CSS px. */
const CORE_HALF_WIDTH = 1.8;
/** The core's width at the end of the tail, against its width at the head. */
const TAIL_WIDTH = 0.35;
/** How far the light runs ahead of a comet's head, and behind it. */
const FRONT_LENGTH = 3;
const HEAD_LENGTH = 18;
/** The tail's brightness against the head's. */
const TAIL_GAIN = 0.95;
/** How far the tail goes from the core's colour towards the tint. */
const TAIL_TINT = 0.5;
/** The width of the bloom round the core, in CSS px. */
const BLOOM_SIGMA = 3.5;

/**
 * Where the core runs, in CSS px inside the edge, how strong its bloom is,
 * and how far the light goes to the bloom's colour where it is over the
 * page. On a light page the core runs on the track, where a white glint
 * shows, and over the page the light takes the bloom's colour.
 *
 * @internal
 */
export const RING_LIGHT_LOOK = {
  light: { inset: 1.1, bloom: 0.9, pageTint: 1 },
  dark: { inset: 0, bloom: 0.8, pageTint: 0 },
} as const;

/** How far from the edge the core and its bloom reach, in CSS px. */
const RIM_REACH = 1 + CORE_HALF_WIDTH + 3 * BLOOM_SIGMA;

/**
 * The render shader of the ring light, with each element that has a ring
 * light this frame in group 2. Each instance is one element: a quad around
 * it out to the reach of the light, which lights the outline where a comet
 * is.
 *
 * @internal
 */
export const RING_LIGHT_WGSL = /* wgsl */ `${TARGET_WGSL}
const CORE_HALF_WIDTH = ${CORE_HALF_WIDTH.toFixed(2)};
const TAIL_WIDTH = ${TAIL_WIDTH.toFixed(2)};
const FRONT_LENGTH = ${FRONT_LENGTH.toFixed(2)};
const HEAD_LENGTH = ${HEAD_LENGTH.toFixed(2)};
const TAIL_GAIN = ${TAIL_GAIN.toFixed(2)};
const TAIL_TINT = ${TAIL_TINT.toFixed(2)};
const BLOOM_SIGMA = ${BLOOM_SIGMA.toFixed(2)};
const RIM_REACH = ${RIM_REACH.toFixed(2)};
const PI = 3.14159265;

struct RingLightInstance {
  element: u32,
  cometCount: u32,
  even: f32,
  alpha: f32,
  core: vec4f,
  tint: vec4f,
  // The bloom's colour, and its strength as alpha.
  bloom: vec4f,
  // The head as a share of the outline, the direction, the strength and the
  // tail as a share of the outline.
  comets: array<vec4f, 2>,
  inset: f32,
  pageTint: f32,
}

@group(2) @binding(0) var<storage, read> ringLights: array<RingLightInstance>;

struct RingLightVarying {
  @builtin(position) position: vec4f,
  @location(0) @interpolate(flat) instance: u32,
}

fn cornerRadius(element: EffectElement) -> f32 {
  let radii = element.radii;
  let radius = min(min(radii.x, radii.y), min(radii.z, radii.w));
  return max(0.0, min(radius, min(element.rect.z, element.rect.w) * 0.5));
}

fn outlineLength(element: EffectElement, radius: f32) -> f32 {
  return 2.0 * (element.rect.z - 2.0 * radius) + 2.0 * (element.rect.w - 2.0 * radius) + 2.0 * PI * radius;
}

// How far along the outline the point of it nearest to page is, in CSS px
// from the middle of the top edge, clockwise: outlineParam of
// outline-param.ts.
fn outlineParam(element: EffectElement, radius: f32, page: vec2f) -> f32 {
  let half = element.rect.zw * 0.5;
  let a = half.x - radius;
  let b = half.y - radius;
  let local = page - element.rect.xy - half;
  let quarter = PI * 0.5 * radius;
  let startRight = a + quarter;
  let startBottom = a + 2.0 * quarter + 2.0 * b;
  let startLeft = 3.0 * a + 3.0 * quarter + 2.0 * b;
  let startTopLeft = 3.0 * a + 4.0 * quarter + 4.0 * b;

  let onTop = select(startTopLeft + local.x + a, local.x, local.x >= 0.0);
  let onBottom = startBottom + (a - local.x);
  let onRight = startRight + (local.y + b);
  let onLeft = startLeft + (b - local.y);

  if (abs(local.x) <= a && abs(local.y) <= b) {
    let toTop = local.y + half.y;
    let toBottom = half.y - local.y;
    let toLeft = local.x + half.x;
    let toRight = half.x - local.x;
    let nearest = min(min(toTop, toBottom), min(toLeft, toRight));
    if (nearest == toTop) { return onTop; }
    if (nearest == toBottom) { return onBottom; }
    return select(onRight, onLeft, nearest == toLeft);
  }
  if (abs(local.x) <= a) {
    return select(onBottom, onTop, local.y < 0.0);
  }
  if (abs(local.y) <= b) {
    return select(onRight, onLeft, local.x < 0.0);
  }
  let centre = vec2f(sign(local.x) * a, sign(local.y) * b);
  var angle = atan2(local.y - centre.y, local.x - centre.x);
  if (local.x > 0.0 && local.y < 0.0) {
    return a + (angle + PI * 0.5) * radius;
  }
  if (local.x > 0.0) {
    return a + quarter + 2.0 * b + angle * radius;
  }
  if (local.y > 0.0) {
    return 3.0 * a + 2.0 * quarter + 2.0 * b + (angle - PI * 0.5) * radius;
  }
  if (angle > 0.0) { angle -= 2.0 * PI; }
  return 3.0 * a + 3.0 * quarter + 4.0 * b + (angle + PI) * radius;
}

@vertex
fn ringLightVertex(
  @builtin(vertex_index) vertex: u32,
  @builtin(instance_index) instance: u32,
) -> RingLightVarying {
  let ring = ringLights[instance];
  let element = effectElements[ring.element];
  let corner = vec2f(f32(vertex & 1u), f32((vertex >> 1u) & 1u));
  let page = element.rect.xy - RIM_REACH + corner * (element.rect.zw + 2.0 * RIM_REACH);
  return RingLightVarying(pageToClip(page), instance);
}

// How much of a pixel a line of half width half covers, at across from its
// middle, anti-aliased over one pixel. A line thinner than a pixel dims
// instead.
fn band(across: f32, half: f32, pixel: f32) -> f32 {
  let wide = max(half, 0.5 * pixel);
  return saturate((wide - abs(across)) / pixel + 0.5) * half / wide;
}

@fragment
fn ringLightFragment(input: RingLightVarying) -> @location(0) vec4f {
  let ring = ringLights[input.instance];
  let element = effectElements[ring.element];
  let page = fragmentToPage(input.position.xy);
  let pixel = 1.0 / effectTarget.pixelScale.x;
  let edge = effectElementDistance(element, page);
  let across = edge + ring.inset;

  if (abs(across) >= RIM_REACH) {
    return vec4f(0.0);
  }
  let radius = cornerRadius(element);
  let length = max(outlineLength(element, radius), 1.0);
  let along = outlineParam(element, radius, page) / length;
  var light = ring.even;
  var shape = 1.0;
  var head = 1.0;
  for (var i = 0u; i < ring.cometCount; i += 1u) {
    let comet = ring.comets[i];
    // How far behind the head this point is, as a share of the outline.
    let behind = fract((comet.x - along) * comet.y);
    let back = behind * length / HEAD_LENGTH;
    let ahead = (1.0 - behind) * length / FRONT_LENGTH;
    let atHead = max(exp(-back * back), exp(-ahead * ahead));
    let tail = pow(saturate(1.0 - behind / comet.w), 1.2) * TAIL_GAIN;
    let lit = max(atHead, tail);
    if (comet.z * lit > light) {
      light = comet.z * lit;
      shape = lit;
      head = atHead;
    }
  }
  let half = CORE_HALF_WIDTH * mix(TAIL_WIDTH, 1.0, shape);
  let core = band(across, half, pixel) * light;
  let spread = across / BLOOM_SIGMA;
  let bloom = exp(-spread * spread) * light * mix(0.4, 1.0, head);
  let white = mix(1.0 - TAIL_TINT, 1.0, head);
  if (core + bloom < 1.0 / 512.0) {
    return vec4f(0.0);
  }

  let onPage = smoothstep(-0.5 * pixel, 0.5 * pixel, edge) * ring.pageTint;
  let glint = mix(mix(ring.tint.rgb, ring.core.rgb, white), ring.bloom.rgb, onPage);
  let clip = effectClip(element.scope, page) * ring.alpha;
  let coreAlpha = saturate(core) * ring.core.a;
  let bloomAlpha = saturate(bloom * ring.bloom.a);
  let alpha = (coreAlpha + bloomAlpha * (1.0 - coreAlpha)) * clip;
  let rgb = (glint * coreAlpha + ring.bloom.rgb * bloomAlpha * (1.0 - coreAlpha)) * clip;
  return vec4f(rgb, alpha);
}
`;

/**
 * One element with a ring light this frame.
 *
 * @internal
 */
export interface RingLightInstance {
  /** Its index in `EffectFrame.elements` and in WGSL's `effectElements`. */
  readonly elementIndex: number;
  readonly state: RingLightState;
  /** The glint, sRGB with its strength as alpha. */
  readonly core: EffectColor;
  /** The colour a comet's tail takes a hint of. */
  readonly tint: EffectColor;
  /** The bloom round the glint, sRGB with its strength as alpha. */
  readonly bloom: EffectColor;
  /** The most the light covers the page. */
  readonly alpha: number;
  /** How far inside the edge the glint runs, in CSS px. */
  readonly inset: number;
  /** How far the light goes to the bloom's colour where it is over the page. */
  readonly pageTint: number;
}

/**
 * The byte size of one `RingLightInstance`: its fields take 104 bytes, and
 * the struct's stride rounds up to 16.
 *
 * @internal
 */
export const RING_LIGHT_INSTANCE_BYTES = 112;

const INSTANCE_WORDS = RING_LIGHT_INSTANCE_BYTES / 4;

/**
 * Packs the instances in order as `RingLightInstance` structs at the start of
 * `buffer`, which must hold at least that many.
 *
 * @internal
 */
export function packRingLightInstances(
  instances: readonly RingLightInstance[],
  buffer: ArrayBuffer,
) {
  const floats = new Float32Array(buffer);
  const words = new Uint32Array(buffer);
  for (const [index, instance] of instances.entries()) {
    const at = index * INSTANCE_WORDS;
    const { comets, even } = instance.state;
    words.fill(0, at, at + INSTANCE_WORDS);
    words[at] = instance.elementIndex;
    words[at + 1] = comets.length;
    floats[at + 2] = even;
    floats[at + 3] = instance.alpha;
    floats.set(instance.core, at + 4);
    floats.set(instance.tint, at + 8);
    floats.set(instance.bloom, at + 12);
    for (const [slot, comet] of comets.slice(0, 2).entries()) {
      floats.set(
        [comet.head, comet.direction, comet.strength, comet.tail],
        at + 16 + slot * 4,
      );
    }
    floats[at + 24] = instance.inset;
    floats[at + 25] = instance.pageTint;
  }
}
