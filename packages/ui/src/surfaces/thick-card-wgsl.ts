import { LIQUID_MATERIAL_WGSL } from "../effect-layer/liquid-material-wgsl.ts";

/**
 * The Sheet's thick card: one pass over the card that casts a ray from the
 * eye of the card's CSS perspective into a slab with a rounded edge, and
 * shades the edge it meets in the card's material. Over the card's face it
 * draws only the turn of the edge; past the face it draws the edge, and a
 * soft shade on the page around it.
 *
 * @internal
 */
export const THICK_CARD_WGSL = /* wgsl */ `
${LIQUID_MATERIAL_WGSL}

struct Thick {
  view: vec4f,  // canvas width, height in CSS px, margin, device pixel ratio
  card: vec4f,  // width, height, corner radius, corner exponent
  tilt: vec4f,  // angle in radians, perspective, depth, bevel width
  base: vec4f,  // the card's colour, 1 when it is dark
  look: vec4f,  // share of the full tilt, 1 for glass
}

@group(0) @binding(0) var<uniform> u: Thick;

@vertex
fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  let p = vec2f(f32((i << 1u) & 2u), f32(i & 2u));
  return vec4f(p * 2.0 - 1.0, 0.0, 1.0);
}

fn faceDistance(p: vec2f) -> f32 {
  let half = u.card.xy * 0.5;
  let r = u.card.z;
  let q = abs(p - half) - (half - vec2f(r));
  let m = max(q, vec2f(0.0));
  let n = u.card.w;
  let corner = pow(pow(m.x, n) + pow(m.y, n), 1.0 / n);
  return corner + min(max(q.x, q.y), 0.0) - r;
}

// The point on the card's plane at depth z that shows at screen point s.
fn onRay(s: vec2f, z: f32) -> vec2f {
  let c = cos(u.tilt.x);
  let sn = sin(u.tilt.x);
  let p = u.tilt.y;
  let h = u.card.y * 0.5;
  let x = s.x - u.card.x * 0.5;
  let v = (s.y * (1.0 - z * c / p) - z * sn - h) / (c - s.y * sn / p);
  let w = 1.0 + (v * sn - z * c) / p;
  return vec2f(x * w + u.card.x * 0.5, v + h);
}

// The slab: its edge is a half ellipse, as wide as the bevel and as deep
// as the slab, so it bulges to the face's outline at half the depth.
fn slab(p: vec2f, z: f32) -> f32 {
  let a = u.tilt.w;
  let k = 2.0 * a / u.tilt.z;
  let e = vec2f(max(faceDistance(p) + a, 0.0), abs(z * k + a));
  return length(e) - a;
}

const STEPS = 48;

@fragment
fn fs(@builtin(position) frag: vec4f) -> @location(0) vec4f {
  let dpr = u.view.w;
  let s = frag.xy / dpr - vec2f(u.view.z);
  let depth = u.tilt.z;
  let a = u.tilt.w;
  let share = u.look.x;
  let isGlass = u.look.y > 0.5;
  let isDark = u.base.w > 0.5;
  if (depth < 0.05 || a < 0.05) {
    return vec4f(0.0);
  }

  var prev = slab(onRay(s, 0.0), 0.0);
  var hit = prev <= 0.001;
  var hz = 0.0;
  var least = prev;
  for (var i = 1; i <= STEPS; i++) {
    let z = -depth * f32(i) / f32(STEPS);
    let f = slab(onRay(s, z), z);
    if (!hit && f <= 0.0) {
      hit = true;
      let zPrev = -depth * f32(i - 1) / f32(STEPS);
      hz = mix(zPrev, z, prev / (prev - f));
    }
    prev = f;
    least = min(least, f);
  }

  let c = cos(u.tilt.x);
  let sn = sin(u.tilt.x);
  let base = u.base.rgb;
  // The colour of the edge seen side on, for the silhouette.
  let grazing = select(base * 0.86, base + vec3f(0.07), isDark);

  if (!hit) {
    let cover = saturate(0.5 - least * dpr);
    let shade = 0.1 * share * exp(-max(least, 0.0) / 7.0) * (1.0 - cover);
    let edge = premultiplied(vec4f(grazing, cover * select(1.0, 0.6, isGlass)));
    return over(edge, vec4f(0.0, 0.0, 0.0, shade));
  }

  let p = onRay(s, hz);
  let d = faceDistance(p);
  let dh = 0.5;
  let g = normalize(vec2f(
    faceDistance(p + vec2f(dh, 0.0)) - faceDistance(p - vec2f(dh, 0.0)),
    faceDistance(p + vec2f(0.0, dh)) - faceDistance(p - vec2f(0.0, dh)),
  ) + vec2f(1e-6));
  let k = 2.0 * a / depth;
  let e = vec2f(max(d + a, 0.0), hz * k + a);
  var local = vec3f(0.0, 0.0, 1.0);
  if (e.x > 0.0) {
    let el = normalize(vec2f(e.x, abs(e.y)) + vec2f(1e-6));
    local = normalize(vec3f(g * el.x, sign(e.y) * el.y * k));
  }
  let normal = vec3f(local.x, local.y * c + local.z * sn, -local.y * sn + local.z * c);
  let face = vec3f(0.0, sn, c);

  // Light rolls off the edge: a little brighter where it turns to the
  // light, a little darker where it turns away and as it goes side on.
  let toward = dot(normal, TO_LIGHT) - dot(face, TO_LIGHT);
  let side = 1.0 - saturate(normal.z);
  var color: vec3f;
  if (isDark) {
    color = base + vec3f(0.08 * side * side + 0.05 * toward);
  } else {
    color = base * (1.0 - 0.15 * side * side + 0.12 * min(toward, 0.0)) + vec3f(0.04 * max(toward, 0.0));
  }
  var alpha = 1.0;
  if (isGlass) {
    // The thin rim lets a little light through.
    color += vec3f(0.1 * pow(side, 3.0));
    alpha = mix(1.0, 0.6, side);
  }
  let lit = max(dot(normal, HALFWAY), 0.0);
  let highlight = 0.55 * pow(lit, 90.0) + 0.04 * pow(lit, 12.0);
  color = mix(color, vec3f(1.0), saturate(highlight * share));

  // Over the card's face only the turn of the edge shows.
  let onFace = faceDistance(onRay(s, 0.0));
  let turn = smoothstep(0.0, 0.3, 1.0 - local.z);
  alpha *= mix(turn, 1.0, saturate(0.5 + onFace * dpr));
  return premultiplied(vec4f(saturate(color), alpha));
}
`;
