import { LIQUID_MATERIAL_WGSL } from "./liquid-material-wgsl.ts";
import { SHEET_EDGE_BAND } from "./sheet-edge-band.ts";
import { SHEET_EDGE_SAMPLES } from "./step-sheet-edge.ts";
import { TARGET_WGSL } from "./target-wgsl.ts";

const FLAG_LIGHT_BODY = 1;

/**
 * One Sheet's edge as a frame draws it, in page coordinates and CSS px.
 *
 * @internal
 */
export interface SheetEdgeInstance {
  /** The index of the element that carries the Sheet in `EffectFrame.elements`. */
  readonly elementIndex: number;
  /** Its samples' start in the height buffer; `SHEET_EDGE_SAMPLES` follow. */
  readonly firstSample: number;
  /** The card's border box. */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** The card's corner radii, top-left first and then clockwise, and their exponent. */
  readonly radii: readonly [number, number, number, number];
  readonly cornerExponent: number;
  /** The card's colour, sRGB-encoded. */
  readonly color: readonly [number, number, number];
  /** The card's colour is light, so a light highlight on it does not show. */
  readonly lightBody: boolean;
  /** The way to the light, a unit vector. */
  readonly light: readonly [number, number];
  /** How solid the band is, from 0 as water near the surface to 1 as the card's own fill. */
  readonly firm: number;
  /** How much of the lit edge it draws, from 0 to 1. */
  readonly edgeLit: number;
  /** The radius of the dome of water along the edge, in CSS px. */
  readonly domeRadius: number;
  /** How much of the band the effect draws, from 0 to 1. */
  readonly shown: number;
}

/**
 * The render shader of the Sheet edge, with each Sheet's edge this frame
 * in group 2. Each instance is one Sheet: a quad over the band at the top
 * of its card. The card's rigid shape has its straight top edge replaced
 * by the height field, a wave the edge's step moves, and the band is the
 * card's own colour: water near the surface, with the family's dome, rim,
 * highlight and contact line, which sets into the solid fill from the deep
 * part out and from the middle of the edge outward, and the solid fill
 * below, where the card's own fill takes over. At rest it adds only the
 * family's lit edge.
 *
 * @internal
 */
export const SHEET_EDGE_WGSL = /* wgsl */ `${TARGET_WGSL}
${LIQUID_MATERIAL_WGSL}
const SAMPLES = ${String(SHEET_EDGE_SAMPLES)}u;
const RISE = ${String(SHEET_EDGE_BAND.rise)}.0;
const DEPTH = ${String(SHEET_EDGE_BAND.depth)}.0;
const SPILL = ${String(SHEET_EDGE_BAND.spill)}.0;
const FLAG_LIGHT_BODY = ${String(FLAG_LIGHT_BODY)}u;
// The wave fades to nothing this share of the edge in from each corner, so
// that it meets the corner's arc with no crease.
const TAPER = 0.08;
// The middle of the edge sets this much sooner than its ends.
const SET_LEAD = 0.35;
// How far into the band the water reaches, as a share of the dome radius.
const WET_REACH = 1.2;
// How much of the water's shading the band takes at the surface: the water
// over a card is thin, and it thins further down.
const WET_STRENGTH = 0.6;

struct SheetEdgeInstance {
  element: u32,
  firstSample: u32,
  flags: u32,
  padding: u32,
  rect: vec4f,
  radii: vec4f,
  // The card's colour, and the exponent of its corners.
  color: vec4f,
  // The way to the light, how firm the band is, and how much of the lit
  // edge shows.
  light: vec4f,
  // The dome radius, the start and the end of the straight part of the
  // top edge in page x, and how much of the band shows.
  band: vec4f,
}

@group(2) @binding(0) var<storage, read> edges: array<SheetEdgeInstance>;
@group(2) @binding(1) var<storage, read> heights: array<f32>;

struct SheetEdgeVarying {
  @builtin(position) position: vec4f,
  @location(0) @interpolate(flat) instance: u32,
}

@vertex
fn sheetEdgeVertex(
  @builtin(vertex_index) vertex: u32,
  @builtin(instance_index) instance: u32,
) -> SheetEdgeVarying {
  let edge = edges[instance];
  let corner = vec2f(f32(vertex & 1u), f32((vertex >> 1u) & 1u));
  let origin = edge.rect.xy - vec2f(SPILL, RISE);
  let size = vec2f(edge.rect.z + 2.0 * SPILL, RISE + DEPTH);
  return SheetEdgeVarying(pageToClip(origin + corner * size), instance);
}

// The height of the edge at u across its straight part, and its slope per
// unit of u: a cubic through the samples, tapered to nothing at the ends.
fn heightAt(edge: SheetEdgeInstance, u: f32) -> vec2f {
  let last = f32(SAMPLES - 1u);
  let at = clamp(u, 0.0, 1.0) * last;
  let i = u32(floor(min(at, last - 1.0)));
  let t = at - f32(i);
  let i0 = max(i, 1u) - 1u;
  let i3 = min(i + 2u, SAMPLES - 1u);
  let p0 = heights[edge.firstSample + i0];
  let p1 = heights[edge.firstSample + i];
  let p2 = heights[edge.firstSample + i + 1u];
  let p3 = heights[edge.firstSample + i3];
  let m1 = 0.5 * (p2 - p0);
  let m2 = 0.5 * (p3 - p1);
  let t2 = t * t;
  let t3 = t2 * t;
  let h = (2.0 * t3 - 3.0 * t2 + 1.0) * p1 + (t3 - 2.0 * t2 + t) * m1
    + (-2.0 * t3 + 3.0 * t2) * p2 + (t3 - t2) * m2;
  let dh = (6.0 * t2 - 6.0 * t) * p1 + (3.0 * t2 - 4.0 * t + 1.0) * m1
    + (-6.0 * t2 + 6.0 * t) * p2 + (3.0 * t2 - 2.0 * t) * m2;
  let taper = smoothstep(0.0, TAPER, u) * smoothstep(1.0, 1.0 - TAPER, u);
  let dTaper = (smoothstep(0.0, TAPER, u + 0.002) * smoothstep(1.0, 1.0 - TAPER, u + 0.002) - taper) / 0.002;
  return vec2f(h * taper, dh * last * taper + h * dTaper);
}

// The card's rigid shape: its border box with its own corners.
fn cardShape(edge: SheetEdgeInstance) -> EffectElement {
  var shape = effectElements[edge.element];
  shape.rect = edge.rect;
  shape.radii = edge.radii;
  shape.cornerExponent = edge.color.w;
  return shape;
}

// How far below the card's top the top boundary is at a page x inside one
// of the top corners: the corner's superellipse, from 0 where the straight
// part starts to the radius at the side.
fn cornerTop(edge: SheetEdgeInstance, x: f32, right: bool) -> f32 {
  let radius = max(select(edge.radii.x, edge.radii.y, right), 1e-3);
  let start = select(edge.band.y, edge.band.z, right);
  let n = max(edge.color.w, 1.0);
  let across = clamp(abs(x - start) / radius, 0.0, 1.0);
  let up = pow(max(1.0 - pow(across, n), 0.0), 1.0 / n);
  return radius * (1.0 - up);
}

// The top boundary of the band at a page point, as a surface: the wave
// along the straight part of the top edge, and the card's own corner arcs
// beside it. It is the top boundary only, with no side and no bottom, so
// the depth below it keeps growing down the sides of the band.
fn edgeSurface(edge: SheetEdgeInstance, page: vec2f) -> Surface {
  let x0 = edge.band.y;
  let x1 = edge.band.z;
  let local = page - edge.rect.xy;
  let u = (page.x - x0) / max(x1 - x0, 1.0);
  if (u <= 0.0 || u >= 1.0) {
    // The same corner for every sample, or the slope across the join
    // between the corners would be a cliff.
    let right = u >= 1.0;
    let e = 0.5;
    let slope = (cornerTop(edge, page.x + e, right) - cornerTop(edge, page.x - e, right)) / (2.0 * e);
    let norm = inverseSqrt(1.0 + slope * slope);
    return Surface(-(local.y - cornerTop(edge, page.x, right)) * norm, vec2f(-slope, -1.0) * norm);
  }
  let wave = heightAt(edge, u);
  let slope = wave.y / max(x1 - x0, 1.0);
  let norm = inverseSqrt(1.0 + slope * slope);
  // Inside is below the surface, which sits at -h.
  return Surface(-(local.y + wave.x) * norm, vec2f(-slope, -1.0) * norm);
}

// The card's rigid shape with its top edge lifted away, so the band's
// coverage follows the card's sides and corners exactly, and the wave
// alone decides the top.
fn sideDistance(edge: SheetEdgeInstance, page: vec2f) -> f32 {
  var shape = cardShape(edge);
  let lift = RISE + 1.0;
  shape.rect = vec4f(edge.rect.x, edge.rect.y - lift, edge.rect.z, edge.rect.w + lift);
  shape.radii = vec4f(0.0, 0.0, shape.radii.z, shape.radii.w);
  return effectElementDistance(shape, page);
}

@fragment
fn sheetEdgeFragment(input: SheetEdgeVarying) -> @location(0) vec4f {
  let edge = edges[input.instance];
  let page = fragmentToPage(input.position.xy);
  let pixel = effectTarget.pixelScale.x;
  let surface = edgeSurface(edge, page);
  let d = surface.distance;
  // The band is the card's sides, cut by the top boundary.
  let coverage = saturate(0.5 - max(d, sideDistance(edge, page)) * pixel);
  if (coverage <= 0.0 && d >= 4.0) {
    return vec4f(0.0);
  }
  let shown = edge.band.w;
  let radius = edge.band.x;
  let depth = -d;
  let cardColor = edge.color.rgb;
  let lightBody = (edge.flags & FLAG_LIGHT_BODY) != 0u;
  var acc = vec4f(0.0);
  if (coverage > 0.0) {
    var body = cardColor;
    let inward = depth / radius;
    if (inward < WET_REACH * (1.0 + MELT_WIDTH)) {
      // The middle of the edge sets first.
      let x0 = edge.band.y;
      let x1 = edge.band.z;
      let fromMiddle = abs((page.x - x0) / max(x1 - x0, 1.0) - 0.5) * 2.0;
      let firm = saturate(edge.light.z * (1.0 + SET_LEAD) - SET_LEAD * fromMiddle);
      let solid = solidAt(inward / WET_REACH, firm);
      if (solid < 1.0) {
        let dome = domeAt(min(depth, radius), radius, surface.outward);
        let wet = wetShade(cardColor, dome, surface.outward, depth, radius, false);
        let thin = WET_STRENGTH * (1.0 - saturate(inward / (WET_REACH * (1.0 + MELT_WIDTH))));
        body = mix(cardColor, wet, thin * (1.0 - solid));
      }
    }
    acc = vec4f(body, 1.0) * coverage * shown;
  }
  let edgeLit = edge.light.w;
  if (edgeLit > 0.0 && d < 4.0 && sideDistance(edge, page) < 0.5) {
    let facing = dot(surface.outward, edge.light.xy);
    acc = litEdge(acc, d, saturate(facing), saturate(-facing), lightBody, edgeLit * shown);
  }
  let element = effectElements[edge.element];
  return vec4f(effectGrayscale(acc.rgb, element.grayscale), acc.a);
}
`;

/**
 * The byte size of one `SheetEdgeInstance`.
 *
 * @internal
 */
export const SHEET_EDGE_INSTANCE_BYTES = 96;

const INSTANCE_WORDS = SHEET_EDGE_INSTANCE_BYTES / 4;

/**
 * Packs the instances in order as `SheetEdgeInstance` structs at the start
 * of `buffer`, which must hold at least that many.
 *
 * @internal
 */
export function packSheetEdgeInstances(
  instances: readonly SheetEdgeInstance[],
  buffer: ArrayBuffer,
) {
  const floats = new Float32Array(buffer);
  const words = new Uint32Array(buffer);
  for (const [index, edge] of instances.entries()) {
    const at = index * INSTANCE_WORDS;
    words.fill(0, at, at + INSTANCE_WORDS);
    words[at] = edge.elementIndex;
    words[at + 1] = edge.firstSample;
    words[at + 2] = edge.lightBody ? FLAG_LIGHT_BODY : 0;
    floats.set([edge.x, edge.y, edge.width, edge.height], at + 4);
    floats.set(edge.radii, at + 8);
    floats.set([...edge.color, edge.cornerExponent], at + 12);
    floats.set([...edge.light, edge.firm, edge.edgeLit], at + 16);
    floats.set(
      [
        edge.domeRadius,
        edge.x + edge.radii[0],
        edge.x + edge.width - edge.radii[1],
        edge.shown,
      ],
      at + 20,
    );
  }
}

/**
 * Packs the height samples of each instance, `SHEET_EDGE_SAMPLES` floats
 * each, at the start of `buffer`.
 *
 * @internal
 */
export function packSheetEdgeHeights(
  fields: readonly Float32Array[],
  buffer: ArrayBuffer,
) {
  const floats = new Float32Array(buffer);
  for (const [index, field] of fields.entries()) {
    floats.set(field, index * SHEET_EDGE_SAMPLES);
  }
}
