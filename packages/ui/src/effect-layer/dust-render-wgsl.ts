import { DUST_SHARED_WGSL } from "./dust-shared-wgsl.ts";
import { TARGET_WGSL } from "./target-wgsl.ts";

/**
 * The still motes drawn around each element that sheds dust under reduced
 * motion.
 *
 * @internal
 */
export const DUST_MOTES_PER_ELEMENT = 28;

/**
 * Draws each live particle as a soft dot, stretched along its velocity as it
 * speeds up, and under reduced motion still motes around each element that
 * sheds dust, each clipped to its Effect container. The first instance of a
 * draw picks the dust that draws over a light backdrop, 0, or a dark one, 1.
 *
 * @internal
 */
export const DUST_RENDER_WGSL = /* wgsl */ `${TARGET_WGSL}
${DUST_SHARED_WGSL}

@group(2) @binding(0) var<storage, read> particles: array<DustParticle>;
@group(2) @binding(1) var<storage, read> dustElements: array<DustElement>;

const MOTES_PER_ELEMENT = ${String(DUST_MOTES_PER_ELEMENT)}u;
const RADIUS_MIN = 0.6;
const RADIUS_MAX = 1.5;
// How far a particle's streak reaches back, as the seconds it travels.
const STREAK_SECONDS = 0.035;
const STREAK_MAX = 22.0;
const FADE_IN = 0.9;
const FADE_OUT = 1.6;
const FLICKER = 0.25;
const MOTE_SPREAD = 26.0;
// The longest streak and the widest dot, so a particle just past the drawn
// part of a band still draws the part of it inside.
const DRAWN_MARGIN = STREAK_MAX + RADIUS_MAX + 1.0;

struct DustVarying {
  @builtin(position) position: vec4f,
  // CSS px from the head of the particle, along and across its motion.
  @location(0) local: vec2f,
  // Radius and streak length, CSS px.
  @location(1) @interpolate(flat) shape: vec2f,
  // Premultiplied.
  @location(2) @interpolate(flat) color: vec4f,
  @location(3) @interpolate(flat) scope: u32,
}

const HIDDEN = DustVarying(vec4f(2.0, 2.0, 2.0, 1.0), vec2f(0.0), vec2f(0.0), vec4f(0.0), EFFECT_PAGE_SCOPE);

// Each quad is two triangles of a triangle list, six vertices in a row: one
// draw of many small quads is cheaper than as many instances.
var<private> QUAD_CORNERS: array<u32, 6> = array<u32, 6>(0u, 1u, 2u, 2u, 1u, 3u);

fn quad(vertex: u32, head: vec2f, direction: vec2f, radius: f32, streak: f32, color: vec4f, scope: u32) -> DustVarying {
  let index = QUAD_CORNERS[vertex % 6u];
  let corner = vec2f(f32(index & 1u), f32((index >> 1u) & 1u));
  let pad = radius + 1.0;
  let local = vec2f(mix(-streak - pad, pad, corner.x), mix(-pad, pad, corner.y));
  let page = head + direction * local.x + vec2f(-direction.y, direction.x) * local.y;
  return DustVarying(pageToClip(page), local, vec2f(radius, streak), color, scope);
}

fn shade(color: vec4f, opacity: f32) -> vec4f {
  return vec4f(color.rgb, 1.0) * color.a * opacity;
}

@vertex
fn particleVertex(
  @builtin(vertex_index) vertex: u32,
  @builtin(instance_index) dark: u32,
) -> DustVarying {
  let particle = particles[vertex / 6u];
  let drawn = effectTarget.drawnPageRange;
  let y = particle.position.y;
  if (particle.age >= particle.life || particle.dark != dark
      || y < drawn.x - DRAWN_MARGIN || y > drawn.y + DRAWN_MARGIN) {
    return HIDDEN;
  }
  let speed = length(particle.velocity);
  let direction = select(vec2f(1.0, 0.0), particle.velocity / speed, speed > 1e-3);
  let radius = mix(RADIUS_MIN, RADIUS_MAX, particle.seed * particle.seed);
  let streak = min(speed * STREAK_SECONDS, STREAK_MAX);
  let flicker = 1.0 - FLICKER * (0.5 + 0.5 * sin(effectPage.seconds * 1.7 + particle.seed * 40.0));
  let opacity = smoothstep(0.0, FADE_IN, particle.age)
    * smoothstep(0.0, FADE_OUT, particle.life - particle.age)
    * particle.intake
    * flicker
    * mix(0.55, 1.0, fract(particle.seed * 7.31))
    * (radius + 1.0) / (radius + 1.0 + streak * 0.08);
  return quad(vertex, particle.position, direction, radius, streak, shade(unpack4x8unorm(particle.color), opacity), particle.scopeIndex);
}

@vertex
fn moteVertex(
  @builtin(vertex_index) vertex: u32,
  @builtin(instance_index) dark: u32,
) -> DustVarying {
  let index = vertex / 6u;
  let elementIndex = index / MOTES_PER_ELEMENT;
  let element = effectElements[elementIndex];
  if ((element.roles & EFFECT_ROLE_DUST) == 0u || dustElements[elementIndex].dark != dark) {
    return HIDDEN;
  }
  let mote = index % MOTES_PER_ELEMENT;
  var state = pcg(element.id * 7919u + mote);
  // Each mote has its own share of the edge, so each side gets motes.
  let edge = edgePoint(element, (f32(mote) + random(&state)) / f32(MOTES_PER_ELEMENT));
  let spread = random(&state);
  let head = edge.position + edge.normal * (2.0 + spread * spread * MOTE_SPREAD);
  let seed = random(&state);
  let radius = mix(RADIUS_MIN, RADIUS_MAX, seed * seed);
  let opacity = (1.0 - spread) * 0.8;
  return quad(vertex, head, vec2f(1.0, 0.0), radius, 0.0, shade(unpack4x8unorm(dustElements[elementIndex].color), opacity), element.scope);
}

@fragment
fn fragmentMain(input: DustVarying) -> @location(0) vec4f {
  let along = clamp(input.local.x, -input.shape.y, 0.0);
  // The tail narrows and fades from the head back, so a fast particle reads
  // as a comet.
  let tail = along / min(-input.shape.y, -1e-3);
  let radius = input.shape.x * (1.0 - 0.6 * tail);
  let distance = length(input.local - vec2f(along, 0.0)) - radius;
  let pixel = 1.0 / effectTarget.pixelScale.x;
  let coverage = 1.0 - smoothstep(-pixel * 0.5, pixel * 0.5, distance);
  if (coverage <= 0.0) {
    return vec4f(0.0);
  }
  return input.color * coverage * (1.0 - tail) * effectClip(input.scope, fragmentToPage(input.position.xy));
}
`;
