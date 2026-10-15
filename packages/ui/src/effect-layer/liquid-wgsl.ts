import { PIXEL_SHARED_WGSL } from "./pixel-wgsl.ts";
import { TARGET_WGSL } from "./target-wgsl.ts";

const FLAG_COVER = 1;
const FLAG_SEE_THROUGH = 2;
const FLAG_LIGHT_BODY = 4;

/**
 * A ring inside the edge of a track: its colour off and on, sRGB-encoded with
 * straight alpha, and its width in CSS px. A ring with no width is none.
 *
 * @internal
 */
export interface TrackRing {
  readonly off: readonly [number, number, number, number];
  readonly on: readonly [number, number, number, number];
  readonly width: number;
}

/**
 * One control's selected surface as a frame draws it, in page coordinates
 * and CSS px: a Switch's thumb or a segmented control's indicator. Track
 * space starts at the origin.
 *
 * @internal
 */
export interface LiquidInstance {
  /** Its control's index in `EffectFrame.elements` and in WGSL's `effectElements`. */
  readonly elementIndex: number;
  /** The rest radius: half the height of the thumb or the indicator. */
  readonly radius: number;
  /** The centre of the off position, where track space starts. */
  readonly originX: number;
  readonly originY: number;
  /** The selected surface's colour over the track, sRGB-encoded. */
  readonly thumb: readonly [number, number, number];
  /** The selected surface's colour is light, so a light highlight on it does not show. */
  readonly lightBody: boolean;
  /** The track's off fill and its on fill. */
  readonly off: readonly [number, number, number];
  readonly on: readonly [number, number, number];
  /** The ring inside the track's edge, which changes from off to on with the fill. */
  readonly ring: TrackRing;
  /**
   * How far the on fill has risen through the track, from 0 off to 1 on,
   * and how far it rises to.
   */
  readonly rise: number;
  readonly riseGoal: number;
  /** The effect paints the track, not only the selected surface. */
  readonly cover: boolean;
  /** The track shows through the selected surface, as through a segmented control's indicator. */
  readonly seeThrough: boolean;
  /** The corners of the rest shape, or none for a pill. */
  readonly corner?: { readonly radius: number; readonly exponent: number };
  /** What the page shows around the track. */
  readonly backdrop: readonly [number, number, number];
  /** How much of the body the effect draws: 1 in motion, 0 at rest, where the control draws it. */
  readonly body: number;
  /** The pill: its centre, half its straight part, and its stretch along and across. */
  readonly pill: readonly [number, number, number, number];
  /** Under reduced motion, the pill that fades out: its centre, half its straight part, and how much of it shows. */
  readonly leaving: readonly [number, number, number];
  /** The way to the light, a unit vector. */
  readonly light: readonly [number, number];
  readonly accent: readonly [number, number, number];
  /** The control's own edge, which the effect draws while it draws the body: ring, two shadows, inset ring. */
  readonly edge: readonly [number, number, number, number];
  /** How much of the lit edge it draws, from 0 to 1. */
  readonly edgeLit: number;
  /**
   * The pixels: the first in the pixel buffer, the cells along and across
   * the pill, and 1 while the pill shows only the cells whose pixels rest
   * in it.
   */
  readonly grid: readonly [number, number, number, number];
  /**
   * How much of the body it still draws in a cell whose pixel is away: at
   * the trailing edge, and `SHED_REACH` px in from it, with a smooth step
   * between.
   */
  readonly holeFill: readonly [number, number];
  /**
   * How far back the pill's past positions blur, in px along the track,
   * how far the red and the blue split from the green, as a share of that,
   * and where the glint that sweeps the edge is, against the pill's centre
   * in px, and how strong.
   */
  readonly motion: readonly [number, number, number, number];
}

/**
 * The render shader of the Liquid effect, with each control's selected
 * surface this frame in group 2. Each instance is one control: a quad over
 * its track. While the surface moves, it paints it as a pill, with the
 * control's own edge, which blurs over the last part of its motion and
 * shows a hole in each cell whose pixel is away. On a Switch it also paints
 * the track while any of it is on: the on fill rises through the off fill,
 * ahead under the pill. At rest the control draws its own surface, and the
 * shader adds only a lit edge to it, and a glint that sweeps that edge once
 * as the pill lands.
 *
 * @internal
 */
export const LIQUID_WGSL = /* wgsl */ `${TARGET_WGSL}
${PIXEL_SHARED_WGSL}
const FLAG_COVER = ${String(FLAG_COVER)}u;
const FLAG_SEE_THROUGH = ${String(FLAG_SEE_THROUGH)}u;
const FLAG_LIGHT_BODY = ${String(FLAG_LIGHT_BODY)}u;
// How far the on fill rises ahead under the pill along the track and
// across it, as a share of the radius.
const RISE_REACH = vec2f(1.9, 1.3);
// How far ahead of the rest of the track the on fill rises under the pill.
const RISE_LEAD = 0.6;
// The track's edge, darker than the fill.
const EDGE_SHADE = 0.3;

struct LiquidInstance {
  element: u32,
  flags: u32,
  radius: f32,
  // How much of the body it still draws in a cell whose pixel is away, at
  // the trailing edge.
  holeFill: f32,
  // The centre of the off position.
  origin: vec2f,
  // How much of the body it draws, and how much of the lit edge.
  body: f32,
  edgeLit: f32,
  thumb: vec4f,
  // The off fill and how far the on fill has risen, then the on fill and
  // how far it rises to.
  off: vec4f,
  on: vec4f,
  backdrop: vec4f,
  // The radius and the exponent of the rest shape's corners, or zero for a
  // pill.
  corner: vec2f,
  // How much of the body it still draws in a cell whose pixel is away,
  // SHED_REACH px in from the trailing edge.
  holeFillDeep: f32,
  // The width of the ring inside the track's edge, and its colour off and
  // on, with straight alpha.
  ringWidth: f32,
  pill: vec4f,
  leaving: vec4f,
  light: vec4f,
  accent: vec4f,
  edge: vec4f,
  grid: vec4f,
  motion: vec4f,
  ringOff: vec4f,
  ringOn: vec4f,
}

@group(2) @binding(0) var<storage, read> liquids: array<LiquidInstance>;
@group(2) @binding(1) var<storage, read> pixels: array<Pixel>;

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

// How far the on fill has risen at a page point: further under the pill
// than on the rest of the track, with no edge between them.
fn risenAt(liquid: LiquidInstance, page: vec2f) -> f32 {
  let reach = liquid.radius * RISE_REACH;
  let fromCentre = page - liquid.origin - vec2f(liquid.pill.x, 0.0);
  let away = vec2f(max(abs(fromCentre.x) - liquid.pill.y, 0.0), fromCentre.y) / reach;
  let rise = liquid.off.w;
  return saturate(rise + (liquid.on.w - rise) * RISE_LEAD * exp(-dot(away, away)));
}

fn fillAt(liquid: LiquidInstance, page: vec2f) -> vec3f {
  return mix(liquid.off.rgb, liquid.on.rgb, risenAt(liquid, page));
}

fn premultiplied(color: vec4f) -> vec4f {
  return vec4f(color.rgb * color.a, color.a);
}

// The track as the control draws it: the fill, with the ring inside its
// edge. The ring changes from off to on as the fill does.
fn coverAt(liquid: LiquidInstance, track: EffectElement, page: vec2f, pixel: f32) -> vec3f {
  let risen = risenAt(liquid, page);
  let fill = mix(liquid.off.rgb, liquid.on.rgb, risen);
  if (liquid.ringWidth <= 0.0) {
    return fill;
  }
  let ring = mix(premultiplied(liquid.ringOff), premultiplied(liquid.ringOn), risen);
  let inRing = saturate(0.5 + (effectElementDistance(track, page) + liquid.ringWidth) * pixel);
  return fill * (1.0 - ring.a * inRing) + ring.rgb * inRing;
}

// The colour of the track at a page point, as the selected surface sees it.
fn trackAt(liquid: LiquidInstance, track: EffectElement, page: vec2f) -> vec3f {
  let edge = effectElementDistance(track, page);
  let fill = fillAt(liquid, page);
  let shaded = mix(fill, liquid.backdrop.rgb, EDGE_SHADE);
  let rim = smoothstep(-1.5, 0.0, edge);
  return mix(mix(fill, shaded, rim), liquid.backdrop.rgb, smoothstep(0.0, 1.0, edge));
}

// The rest shape about its centre, with half its straight part span: a
// pill, or a box with the corners of the control's own indicator.
struct RestShape {
  outline: EffectElement,
  span: f32,
}

fn restShape(liquid: LiquidInstance, span: f32) -> RestShape {
  var outline = effectElements[liquid.element];
  let half = vec2f(span + liquid.radius, liquid.radius);
  outline.rect = vec4f(-half, 2.0 * half);
  outline.radii = vec4f(min(liquid.corner.x, liquid.radius));
  outline.cornerExponent = liquid.corner.y;
  return RestShape(outline, span);
}

fn shapeDistance(liquid: LiquidInstance, shape: RestShape, local: vec2f) -> f32 {
  if (liquid.corner.y == 0.0) {
    let t = local - vec2f(clamp(local.x, -shape.span, shape.span), 0.0);
    return length(t) - liquid.radius;
  }
  return effectElementDistance(shape.outline, local);
}

fn over(top: vec4f, under: vec4f) -> vec4f {
  return top + under * (1.0 - top.a);
}

// A lit bevel: a specular hairline on the lit side, which spills a little
// onto the track, a faint inner shade on the far side, and a glint where a
// corner turns to face the light.
fn litEdge(acc: vec4f, d: f32, lit: f32, away: f32, lightBody: bool, extras: f32) -> vec4f {
  let inner = saturate(1.0 + d / 1.25) * step(d, 0.0);
  let edgeBand = select(saturate(1.0 - d / 0.75), inner, d < 0.0);
  let spec = pow(lit, 2.5) * edgeBand;
  let bloom = select(0.0, 0.6 * exp(-d / 1.2), d > 0.0);
  let glint = pow(lit, 48.0) * (edgeBand + bloom);
  let shade = pow(away, 1.5) * inner;
  let dark = select(0.32, 0.16, lightBody) * shade * extras;
  let light = saturate((select(0.32, 0.85, lightBody) * spec + select(0.75, 1.0, lightBody) * glint) * extras);
  return over(vec4f(vec3f(light), light), over(vec4f(0.0, 0.0, 0.0, dark), acc));
}

// The distance from a rest shape at centre, which stretch stretches along
// the track and across it.
fn pillDistance(liquid: LiquidInstance, shape: RestShape, page: vec2f, centre: f32, stretch: vec2f) -> f32 {
  let local = (page - liquid.origin - vec2f(centre, 0.0)) / stretch;
  return shapeDistance(liquid, shape, local) * min(stretch.x, stretch.y);
}

// The state of the pixel whose cell of the pill holds a page point. A
// point outside the pill takes the nearest cell.
fn cellState(liquid: LiquidInstance, page: vec2f) -> f32 {
  let local = (page - liquid.origin - vec2f(liquid.pill.x, 0.0)) / liquid.pill.zw;
  let size = vec2f(liquid.pill.y + liquid.radius, liquid.radius);
  let unit = saturate((local + size) / (2.0 * size));
  let cols = u32(liquid.grid.y);
  let rows = u32(liquid.grid.z);
  let col = min(u32(unit.x * f32(cols)), cols - 1u);
  let row = min(u32(unit.y * f32(rows)), rows - 1u);
  return pixels[u32(liquid.grid.x) + row * cols + col].life.x;
}

// The control's own ring and shadows round a pill, outside it.
fn pillShadow(liquid: LiquidInstance, shape: RestShape, page: vec2f, d: f32, centre: f32, stretch: vec2f) -> f32 {
  let ring = liquid.edge.x * saturate(1.0 - d / 0.5) * step(0.0, d);
  var near = 0.0;
  var far = 0.0;
  if (liquid.edge.y > 0.0) {
    near = liquid.edge.y * (1.0 - smoothstep(-1.0, 2.0, pillDistance(liquid, shape, page - vec2f(0.0, 1.0), centre, stretch)));
    far = liquid.edge.z * (1.0 - smoothstep(-3.0, 7.0, pillDistance(liquid, shape, page - vec2f(0.0, 2.5), centre, stretch)));
  }
  return 1.0 - (1.0 - ring) * (1.0 - near) * (1.0 - far);
}

// The selected surface over the track, premultiplied: with the control's
// inset ring and top light in dark, and over a track that shows through,
// only the light it adds.
fn pillBody(liquid: LiquidInstance, shape: RestShape, track: EffectElement, page: vec2f, d: f32, centre: f32, stretch: vec2f) -> vec4f {
  var body = liquid.thumb.rgb;
  if (liquid.edge.w > 0.0) {
    let ring = liquid.edge.w * saturate(1.0 + d);
    let top = 0.6 * liquid.edge.w * saturate(pillDistance(liquid, shape, page - vec2f(0.0, 1.0), centre, stretch) + 0.5);
    body = mix(body, vec3f(1.0), saturate(ring + top));
  }
  if ((liquid.flags & FLAG_SEE_THROUGH) == 0u) {
    return vec4f(body, 1.0);
  }
  let under = trackAt(liquid, track, page);
  let ratio = body / max(under, vec3f(1e-3));
  let through = min(1.0, min(ratio.x, min(ratio.y, ratio.z)));
  return vec4f(body - under * through, 1.0 - through);
}

// How much of the pill covers a page point over the last part of its
// motion, in red, green and blue, and green again for alpha: its past
// positions trail it by the blur, and red trails a little further than
// green, and blue a little less.
fn smearedCoverage(liquid: LiquidInstance, shape: RestShape, page: vec2f, pixel: f32) -> vec4f {
  let local = page - liquid.origin - vec2f(liquid.pill.x, 0.0);
  let stretch = liquid.pill.zw;
  let shrink = min(stretch.x, stretch.y);
  let blur = liquid.motion.x;
  if (abs(blur) < 0.25) {
    return vec4f(saturate(0.5 - shapeDistance(liquid, shape, local / stretch) * shrink * pixel));
  }
  let split = liquid.motion.y;
  var sum = vec3f(0.0);
  var count = vec3f(0.0);
  for (var k = 0u; k < 18u; k += 1u) {
    let s = (f32(k) + 0.5) / 18.0 * (1.0 + split);
    let c = saturate(0.5 - shapeDistance(liquid, shape, (local + vec2f(blur * s, 0.0)) / stretch) * shrink * pixel);
    let within = vec3f(1.0, step(s, 1.0), step(s, 1.0 - split));
    sum += c * within;
    count += within;
  }
  let rgb = sum / max(count, vec3f(1.0));
  return vec4f(rgb, rgb.g);
}

fn surfaceAt(liquid: LiquidInstance, track: EffectElement, page: vec2f, pixel: f32) -> vec4f {
  let pillAlpha = liquid.body;
  let leavingAlpha = liquid.leaving.z;
  let lightBody = (liquid.flags & FLAG_LIGHT_BODY) != 0u;
  var acc = vec4f(0.0);
  if ((liquid.flags & FLAG_COVER) != 0u) {
    acc = vec4f(coverAt(liquid, track, page, pixel), 1.0) * max(pillAlpha, leavingAlpha);
  }
  let centre = liquid.pill.x;
  let stretch = liquid.pill.zw;
  let leaving = liquid.leaving.xy;
  let blur = abs(liquid.motion.x);
  let shape = restShape(liquid, liquid.pill.y);
  let d = pillDistance(liquid, shape, page, centre, stretch);
  let leavingShape = restShape(liquid, leaving.y);
  var dLeaving = 1e4;
  if (leavingAlpha > 0.0) {
    dLeaving = pillDistance(liquid, leavingShape, page, leaving.x, vec2f(1.0));
  }
  if (min(d - blur, dLeaving) > 16.0) {
    return acc;
  }
  // The pill shows each cell but those whose pixels are away, as far as
  // the hole fill fills them, and its blur behind it whole.
  var mask = 1.0;
  if (liquid.grid.w > 0.5 && d < 0.0 && cellState(liquid, page) == AWAY) {
    let depth = trailingDepth(vec3f(liquid.pill.xy, liquid.radius), stretch, liquid.motion.x, page - liquid.origin);
    mask = mix(liquid.holeFill, liquid.holeFillDeep, smoothstep(0.0, SHED_REACH, depth));
  }
  let cover = smearedCoverage(liquid, shape, page, pixel);
  let coverLeaving = saturate(0.5 - dLeaving * pixel);
  if (leavingAlpha > 0.0) {
    let shadow = pillShadow(liquid, leavingShape, page, dLeaving, leaving.x, vec2f(1.0)) * (1.0 - coverLeaving) * leavingAlpha;
    acc = over(vec4f(0.0, 0.0, 0.0, shadow), acc);
  }
  if (pillAlpha > 0.0) {
    // A smeared pill casts the shadow of where it is halfway through the
    // smear.
    let mid = pillDistance(liquid, shape, page + vec2f(0.5 * liquid.motion.x, 0.0), centre, stretch);
    let shadow = pillShadow(liquid, shape, page, mid, centre, stretch) * (1.0 - cover.a) * pillAlpha;
    acc = over(vec4f(0.0, 0.0, 0.0, shadow), acc);
  }
  if (leavingAlpha > 0.0 && coverLeaving > 0.0) {
    acc = over(pillBody(liquid, leavingShape, track, page, dLeaving, leaving.x, vec2f(1.0)) * coverLeaving * leavingAlpha, acc);
  }
  if (pillAlpha > 0.0 && cover.a > 0.0) {
    let body = pillBody(liquid, shape, track, page, d, centre, stretch);
    acc = over(vec4f(body.rgb * cover.rgb, body.a * cover.a) * mask * pillAlpha, acc);
  }

  let e = 0.5;
  let gradient = vec2f(
    pillDistance(liquid, shape, page + vec2f(e, 0.0), centre, stretch) - pillDistance(liquid, shape, page - vec2f(e, 0.0), centre, stretch),
    pillDistance(liquid, shape, page + vec2f(0.0, e), centre, stretch) - pillDistance(liquid, shape, page - vec2f(0.0, e), centre, stretch),
  );
  let facing = dot(normalize(gradient + vec2f(1e-5, 0.0)), liquid.light.xy);
  let lit = saturate(facing);
  if (liquid.edgeLit > 0.0) {
    acc = litEdge(acc, d, lit, saturate(-facing), lightBody, liquid.edgeLit);
  }
  // The glint: one highlight that runs along the lit edge as the pill
  // lands. On a light pill, it shows on the track just outside the edge.
  let glint = liquid.motion.w;
  if (glint > 0.0) {
    let along = page.x - liquid.origin.x - centre - liquid.motion.z;
    let reach = along / (0.55 * liquid.radius);
    let spot = exp(-reach * reach);
    let inside = saturate(1.0 + d / 1.5) * step(d, 0.0);
    let outside = saturate(1.0 - d / 1.25) * step(0.0, d) + 0.5 * exp(-max(d, 0.0) / 1.5) * step(0.0, d);
    let band = select(inside + 0.35 * outside, 0.25 * inside + outside, lightBody);
    let tint = mix(vec3f(1.0), liquid.accent.rgb, select(0.0, 0.25, lightBody));
    let light = saturate(glint * spot * band * (0.35 + 0.65 * lit) * select(0.85, 0.7, lightBody));
    acc = over(vec4f(tint * light, light), acc);
  }
  return acc;
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
  let drawn = surfaceAt(liquid, track, page, pixel);
  return vec4f(effectGrayscale(drawn.rgb, track.grayscale), drawn.a) * clip;
}
`;

/**
 * The byte size of one `LiquidInstance`.
 *
 * @internal
 */
export const LIQUID_INSTANCE_BYTES = 256;

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
    words[at + 1] =
      (liquid.cover ? FLAG_COVER : 0) |
      (liquid.seeThrough ? FLAG_SEE_THROUGH : 0) |
      (liquid.lightBody ? FLAG_LIGHT_BODY : 0);
    floats.set([liquid.radius, liquid.holeFill[0]], at + 2);
    floats.set(
      [liquid.originX, liquid.originY, liquid.body, liquid.edgeLit],
      at + 4,
    );
    floats.set([...liquid.thumb, 1], at + 8);
    floats.set([...liquid.off, liquid.rise], at + 12);
    floats.set([...liquid.on, liquid.riseGoal], at + 16);
    floats.set([...liquid.backdrop, 1], at + 20);
    if (liquid.corner !== undefined) {
      floats.set([liquid.corner.radius, liquid.corner.exponent], at + 24);
    }
    floats.set([liquid.holeFill[1], liquid.ring.width], at + 26);
    floats.set(liquid.pill, at + 28);
    floats.set([...liquid.leaving, 0], at + 32);
    floats.set([...liquid.light, 0, 0], at + 36);
    floats.set([...liquid.accent, 0], at + 40);
    floats.set(liquid.edge, at + 44);
    floats.set(liquid.grid, at + 48);
    floats.set(liquid.motion, at + 52);
    floats.set(liquid.ring.off, at + 56);
    floats.set(liquid.ring.on, at + 60);
  }
}
