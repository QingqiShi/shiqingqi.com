import { LIQUID_MATERIAL_WGSL } from "./liquid-material-wgsl.ts";
import { TARGET_WGSL } from "./target-wgsl.ts";

/**
 * The most drops the Sheet's liquid draws at once.
 *
 * @internal
 */
export const MAX_SHEET_DROPS = 32;

/**
 * The byte size of the uniform behind `SHEET_DROPS_WGSL`: five vec4s, then
 * one vec4 for each drop.
 *
 * @internal
 */
export const SHEET_DROPS_BYTES = (5 + MAX_SHEET_DROPS) * 16;

/**
 * The Sheet's card as a body of liquid: a field of drops, each a circle,
 * joined to the card's rounded rectangle by a smooth union, so that drops
 * near each other neck together and merge. It draws one quad over where
 * the drops are, with the material of the Liquid family: a dome at the
 * rim, wet shading, and a body that sets from its centre out.
 *
 * @internal
 */
export const SHEET_DROPS_WGSL = /* wgsl */ `${TARGET_WGSL}
${LIQUID_MATERIAL_WGSL}

struct SheetDrops {
  // The drawn quad: min x, min y, max x, max y, in page coordinates.
  quad: vec4f,
  // The card's rounded rectangle: centre x, centre y, half width, half height.
  body: vec4f,
  // The body's corner radius, how far it lies outside its own shape (0 when
  // it is whole), the smooth union's reach, and how set it is.
  shape: vec4f,
  // The number of drops, the depth that sets last, whether the set part
  // shows the card under it (1) or draws it (0), and the shadow's strength.
  look: vec4f,
  // The card's fill: sRGB, straight alpha.
  fill: vec4f,
  // Each drop: centre x, centre y, radius, unused.
  drops: array<vec4f, ${String(MAX_SHEET_DROPS)}>,
}

@group(2) @binding(0) var<uniform> sheetDrops: SheetDrops;

// The edge of the liquid is a dome this wide where the body is larger.
const EDGE = 18.0;
const SHADOW_REACH = 14.0;
// Light bodies show their shape by shade more than by their light rim.
const BODY_SHADE = 0.16;

struct DropsVertex {
  @builtin(position) position: vec4f,
  @location(0) page: vec2f,
}

@vertex
fn dropsVertex(@builtin(vertex_index) index: u32) -> DropsVertex {
  let corner = vec2f(f32(index & 1u), f32(index >> 1u));
  let page = mix(sheetDrops.quad.xy, sheetDrops.quad.zw, corner);
  return DropsVertex(pageToClip(page), page);
}

struct Field {
  distance: f32,
  gradient: vec2f,
  radius: f32,
}

fn bodyField(page: vec2f) -> Field {
  let offset = page - sheetDrops.body.xy;
  let half = sheetDrops.body.zw;
  let corner = min(sheetDrops.shape.x, min(half.x, half.y));
  let q = abs(offset) - half + corner;
  let outside = max(q, vec2f(0.0));
  var gradient: vec2f;
  if (q.x > 0.0 || q.y > 0.0) {
    gradient = normalize(outside + vec2f(1e-5));
  } else if (q.x > q.y) {
    gradient = vec2f(1.0, 0.0);
  } else {
    gradient = vec2f(0.0, 1.0);
  }
  gradient *= select(vec2f(1.0), vec2f(-1.0), offset < vec2f(0.0));
  let distance = length(outside) + min(max(q.x, q.y), 0.0) - corner + sheetDrops.shape.y;
  return Field(distance, gradient, EDGE);
}

fn fieldAt(page: vec2f) -> Field {
  var field = bodyField(page);
  let reach = max(sheetDrops.shape.z, 0.001);
  let count = u32(sheetDrops.look.x);
  for (var i = 0u; i < count; i += 1u) {
    let drop = sheetDrops.drops[i];
    if (drop.z <= 0.0) {
      continue;
    }
    let toPage = page - drop.xy;
    let length_ = max(length(toPage), 1e-4);
    let distance = length_ - drop.z;
    let h = saturate(0.5 + 0.5 * (field.distance - distance) / reach);
    field.distance = mix(field.distance, distance, h) - reach * h * (1.0 - h);
    field.gradient = mix(field.gradient, toPage / length_, h);
    field.radius = mix(field.radius, min(drop.z, EDGE * 1.6), h);
  }
  return field;
}

@fragment
fn dropsFragment(input: DropsVertex) -> @location(0) vec4f {
  let field = fieldAt(input.page);
  let d = field.distance;
  let coverage = saturate(0.5 - d * effectTarget.pixelScale.x);
  let shadowShare = saturate(1.0 - d / SHADOW_REACH);
  let shadow = vec4f(0.0, 0.0, 0.0, sheetDrops.look.w * shadowShare * shadowShare * step(0.0, d));
  if (coverage <= 0.0) {
    return shadow;
  }
  let outward = normalize(field.gradient + vec2f(1e-5));
  let radius = max(field.radius, 2.0);
  let depth = max(-d, 0.0);
  let fill = sheetDrops.fill.rgb;
  let dome = domeAt(depth, radius, outward);
  var wet = wetShade(fill, dome, outward, depth, radius, false);
  let away = saturate(-dot(outward, TO_LIGHT_FLAT));
  wet *= 1.0 - BODY_SHADE * (1.0 - dome.normal.z) * (0.4 + 0.6 * away);
  let inward = saturate(depth / max(sheetDrops.look.y, 1.0));
  let solid = solidAt(inward, sheetDrops.shape.w);
  let color = mix(wet, fill, solid);
  let shown = coverage * sheetDrops.fill.a * mix(1.0, 1.0 - solid, sheetDrops.look.z);
  return over(vec4f(color * shown, shown), shadow * (1.0 - coverage));
}
`;
