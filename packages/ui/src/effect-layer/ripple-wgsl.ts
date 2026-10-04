import {
  ABSORB_DISTANCE,
  MAX_NEIGHBOURS,
  MAX_PULSES,
  type RippleInstance,
} from "./create-ripples.ts";
import { isLightBackdrop, rippleColor } from "./ripple-color.ts";
import { TARGET_WGSL } from "./target-wgsl.ts";
import type { EffectFrame } from "./types.ts";

/** The most a ring covers the page, on a light page and on a dark one. */
const PEAK_ALPHA = { light: 0.55, dark: 0.95 } as const;

/**
 * The render shader of the Ripple effect, with each element that draws rings
 * this frame in group 2. Each instance is one element: a quad around it out
 * to its furthest crest, which sums its rings at each pixel, inside its
 * Effect container.
 *
 * @internal
 */
export const RIPPLE_WGSL = /* wgsl */ `${TARGET_WGSL}
const ABSORB_DISTANCE = ${ABSORB_DISTANCE.toFixed(1)};
const EDGE_OVERLAP = 1.5;

struct RippleInstance {
  element: u32,
  ringCount: u32,
  neighbourCount: u32,
  // How far the furthest crest is from the edge, in CSS px.
  extent: f32,
  alpha: f32,
  color: vec4f,
  wakes: vec4f,
  neighbours: array<vec4u, ${String(MAX_NEIGHBOURS / 4)}>,
  // The front, the amount, and the aim in the element's box space.
  rings: array<vec4f, ${String(MAX_PULSES)}>,
}

@group(2) @binding(0) var<storage, read> ripples: array<RippleInstance>;

struct RippleVarying {
  @builtin(position) position: vec4f,
  @location(0) @interpolate(flat) instance: u32,
}

fn crestWidth(front: f32) -> f32 {
  return 1.25 + front * 0.03;
}

// How much of a ring shows at offset from its front: a crest with a crisp
// leading edge and a softer trailing side, over an even wake of colour back
// to the element.
fn ringProfile(offset: f32, front: f32, wake: f32) -> f32 {
  let width = crestWidth(front);
  if (offset >= 0.0) {
    let x = offset / width;
    return exp(-x * x);
  }
  let x = offset / (width * 2.5);
  return max(exp(-x * x), wake);
}

@vertex
fn rippleVertex(
  @builtin(vertex_index) vertex: u32,
  @builtin(instance_index) instance: u32,
) -> RippleVarying {
  let ripple = ripples[instance];
  let element = effectElements[ripple.element];
  let margin = ripple.extent + 2.0 * crestWidth(ripple.extent);
  let corner = vec2f(f32(vertex & 1u), f32((vertex >> 1u) & 1u));
  let page = element.rect.xy - margin + corner * (element.rect.zw + 2.0 * margin);
  return RippleVarying(pageToClip(page), instance);
}

@fragment
fn rippleFragment(input: RippleVarying) -> @location(0) vec4f {
  let ripple = ripples[input.instance];
  let element = effectElements[ripple.element];
  let page = fragmentToPage(input.position.xy);
  let edge = effectElementDistance(element, page);
  // The rings start just inside the edge and cover the element's own
  // anti-aliased edge, so that no line of page shows between them.
  if (edge <= -EDGE_OVERLAP) {
    return vec4f(0.0);
  }
  let halfSize = max(element.rect.zw * 0.5, vec2f(1.0));
  let local = (page - element.rect.xy - halfSize) / halfSize;
  let direction = local / max(length(local), 1e-4);

  var clear = 1.0;
  for (var i = 0u; i < ripple.ringCount; i += 1u) {
    let ring = ripple.rings[i];
    let aim = (1.0 + dot(direction, ring.zw)) / (1.0 + length(ring.zw));
    clear *= 1.0 - saturate(ring.y * aim * ringProfile(edge - ring.x, ring.x, ripple.wakes[i]));
  }
  var alpha = (1.0 - clear) * ripple.alpha * smoothstep(-EDGE_OVERLAP, 0.0, edge);
  if (alpha < 1.0 / 512.0) {
    return vec4f(0.0);
  }
  alpha *= effectClip(element.scope, page);
  for (var n = 0u; n < ripple.neighbourCount; n += 1u) {
    let other = effectElements[ripple.neighbours[n / 4u][n % 4u]];
    alpha *= smoothstep(0.0, ABSORB_DISTANCE, effectElementDistance(other, page));
  }
  return vec4f(ripple.color.rgb * alpha, alpha);
}
`;

/**
 * The byte size of one `RippleInstance`.
 *
 * @internal
 */
export const RIPPLE_INSTANCE_BYTES = 160;

const INSTANCE_WORDS = RIPPLE_INSTANCE_BYTES / 4;

/**
 * Packs the instances in order as `RippleInstance` structs at the start of
 * `buffer`, which must hold at least that many. Each ring takes its
 * element's fill, set against the backdrop of its scope.
 *
 * @internal
 */
export function packRippleInstances(
  instances: readonly RippleInstance[],
  { elements, scopes }: Pick<EffectFrame, "elements" | "scopes">,
  buffer: ArrayBuffer,
) {
  const floats = new Float32Array(buffer);
  const words = new Uint32Array(buffer);
  for (const [
    index,
    { elementIndex, rings, neighbours },
  ] of instances.entries()) {
    const at = index * INSTANCE_WORDS;
    const record = elements[elementIndex];
    const { fill } = record;
    const { backdrop } = scopes[record.scopeIndex];
    const peak = isLightBackdrop(backdrop) ? PEAK_ALPHA.light : PEAK_ALPHA.dark;
    words.fill(0, at, at + INSTANCE_WORDS);
    words[at] = elementIndex;
    words[at + 1] = rings.length;
    words[at + 2] = neighbours.length;
    floats[at + 3] = Math.max(0, ...rings.map((ring) => ring.front));
    floats[at + 4] = peak * Math.sqrt(fill[3]);
    floats.set(rippleColor(fill, backdrop), at + 8);
    words.set(neighbours, at + 16);
    for (const [slot, ring] of rings.entries()) {
      floats[at + 12 + slot] = ring.wake;
      floats.set(
        [ring.front, ring.amount, ring.aimX, ring.aimY],
        at + 24 + slot * 4,
      );
    }
  }
}
