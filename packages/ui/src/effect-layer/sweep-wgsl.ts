import type { EffectColor } from "./parse-css-color.ts";
import type { SweepState } from "./sweep-at.ts";
import { TARGET_WGSL } from "./target-wgsl.ts";

/** How far outside the edge the ring light's centre line runs, in CSS px. */
const RING_OFFSET = 5;
/** The width of the bright core and of the glow around it, in CSS px. */
const CORE_SIGMA = 2;
const HALO_SIGMA = 5.5;
/** How far inside the edge the glow still shows, in CSS px. */
const INNER_BLEED = 3;
/** How long a comet's head is along the outline, in CSS px. */
const HEAD_LENGTH = 14;
/** The tail's brightness against the head's. */
const TAIL_GAIN = 0.85;

/**
 * How far past the edge a Sweep draws, in CSS px.
 *
 * @internal
 */
export const SWEEP_EXTENT = RING_OFFSET + 3 * HALO_SIGMA;

/**
 * The most a Sweep covers the page, on a light page and on a dark one.
 *
 * @internal
 */
export const SWEEP_PEAK_ALPHA = { light: 0.9, dark: 1 } as const;

/**
 * The render shader of the Sweep effect, with each element that sweeps this
 * frame in group 2. Each instance is one element: a quad around it out to
 * `SWEEP_EXTENT`, which lights the outline where a comet is.
 *
 * @internal
 */
export const SWEEP_WGSL = /* wgsl */ `${TARGET_WGSL}
const RING_OFFSET = ${RING_OFFSET.toFixed(2)};
const CORE_SIGMA = ${CORE_SIGMA.toFixed(2)};
const HALO_SIGMA = ${HALO_SIGMA.toFixed(2)};
const INNER_BLEED = ${INNER_BLEED.toFixed(2)};
const HEAD_LENGTH = ${HEAD_LENGTH.toFixed(2)};
const TAIL_GAIN = ${TAIL_GAIN.toFixed(2)};
const SWEEP_EXTENT = ${SWEEP_EXTENT.toFixed(2)};
const PI = 3.14159265;

struct SweepInstance {
  element: u32,
  cometCount: u32,
  even: f32,
  alpha: f32,
  core: vec4f,
  halo: vec4f,
  // The head as a share of the outline, the direction, the strength and the
  // tail as a share of the outline.
  comets: array<vec4f, 2>,
}

@group(2) @binding(0) var<storage, read> sweeps: array<SweepInstance>;

struct SweepVarying {
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
fn sweepVertex(
  @builtin(vertex_index) vertex: u32,
  @builtin(instance_index) instance: u32,
) -> SweepVarying {
  let sweep = sweeps[instance];
  let element = effectElements[sweep.element];
  let corner = vec2f(f32(vertex & 1u), f32((vertex >> 1u) & 1u));
  let page = element.rect.xy - SWEEP_EXTENT + corner * (element.rect.zw + 2.0 * SWEEP_EXTENT);
  return SweepVarying(pageToClip(page), instance);
}

@fragment
fn sweepFragment(input: SweepVarying) -> @location(0) vec4f {
  let sweep = sweeps[input.instance];
  let element = effectElements[sweep.element];
  let page = fragmentToPage(input.position.xy);
  let edge = effectElementDistance(element, page);
  if (edge < -INNER_BLEED || edge > SWEEP_EXTENT) {
    return vec4f(0.0);
  }
  let radius = cornerRadius(element);
  let length = max(outlineLength(element, radius), 1.0);
  let along = outlineParam(element, radius, page) / length;

  var light = sweep.even;
  for (var i = 0u; i < sweep.cometCount; i += 1u) {
    let comet = sweep.comets[i];
    // How far behind the head this point is, as a share of the outline.
    let behind = fract((comet.x - along) * comet.y);
    let fromHead = min(behind, 1.0 - behind) * length / HEAD_LENGTH;
    let head = exp(-fromHead * fromHead);
    let tail = select(0.0, pow(1.0 - behind / comet.w, 1.5) * TAIL_GAIN, behind < comet.w);
    light = max(light, comet.z * max(head, tail));
  }
  if (light < 1.0 / 512.0) {
    return vec4f(0.0);
  }
  let across = (edge - RING_OFFSET);
  let core = exp(-across * across / (CORE_SIGMA * CORE_SIGMA));
  let halo = exp(-across * across / (HALO_SIGMA * HALO_SIGMA)) * 0.6;
  let inside = smoothstep(-INNER_BLEED, 0.0, edge);
  let coreAlpha = light * core * inside * sweep.core.a;
  let haloAlpha = light * halo * inside * sweep.halo.a;
  let clip = effectClip(element.scope, page) * sweep.alpha;
  let alpha = (coreAlpha + haloAlpha * (1.0 - coreAlpha)) * clip;
  let rgb = (sweep.core.rgb * coreAlpha + sweep.halo.rgb * haloAlpha * (1.0 - coreAlpha)) * clip;
  return vec4f(rgb, alpha);
}
`;

/**
 * One element that sweeps this frame.
 *
 * @internal
 */
export interface SweepInstance {
  /** Its index in `EffectFrame.elements` and in WGSL's `effectElements`. */
  readonly elementIndex: number;
  readonly state: SweepState;
  /** The bright centre line of the light, sRGB with its strength as alpha. */
  readonly core: EffectColor;
  /** The glow around it. */
  readonly halo: EffectColor;
  /** The most the light covers the page. */
  readonly alpha: number;
}

/**
 * The byte size of one `SweepInstance`.
 *
 * @internal
 */
export const SWEEP_INSTANCE_BYTES = 80;

const INSTANCE_WORDS = SWEEP_INSTANCE_BYTES / 4;

/**
 * Packs the instances in order as `SweepInstance` structs at the start of
 * `buffer`, which must hold at least that many.
 *
 * @internal
 */
export function packSweepInstances(
  instances: readonly SweepInstance[],
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
    floats.set(instance.halo, at + 8);
    for (const [slot, comet] of comets.slice(0, 2).entries()) {
      floats.set(
        [comet.head, comet.direction, comet.strength, comet.tail],
        at + 12 + slot * 4,
      );
    }
  }
}
