/**
 * The Sheet's pebble card: glass over the card whose face curves down over
 * its last few px, like the edge of a pebble. The canvas carries the same
 * tilt as the card, so each fragment is a point of the card's face. The
 * curve reflects a soft studio, a softbox above and to the left over a
 * light ceiling and a dark floor, by Schlick's Fresnel, less what the flat
 * face would reflect, so that the flat face stays the plain card. A thin
 * strip light behind the viewer gives one crisp line where the curve is
 * steepest, on the top left part of the edge only. It draws a veil, white
 * or black, that turns the card's colour under it into the lit glass.
 *
 * @internal
 */
export const PEBBLE_CARD_WGSL = /* wgsl */ `
struct Pebble {
  view: vec4f,  // canvas width, height in CSS px, margin, device pixel ratio
  card: vec4f,  // width, height, top corner radius, bottom corner radius
  pose: vec4f,  // tilt in radians, perspective, corner exponent, curve width
  base: vec4f,  // the card's colour in sRGB
  look: vec4f,  // reflection, specular, studio brightness
}

@group(0) @binding(0) var<uniform> u: Pebble;

// The slope of the curve at the card's outline.
const MAX_SLOPE = 1.36;
// Dense glass, about n = 1.65.
const F0 = 0.06;
const GAMMA = 2.2;
// How deep the shade inside the line is on a light card.
const SHADE = 5.0;

@vertex
fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  let p = vec2f(f32((i << 1u) & 2u), f32(i & 2u));
  return vec4f(p * 2.0 - 1.0, 0.0, 1.0);
}

fn cardDistance(p: vec2f) -> f32 {
  let half = u.card.xy * 0.5;
  let r = select(u.card.w, u.card.z, p.y < half.y);
  let q = abs(p - half) - (half - vec2f(r));
  let m = max(q, vec2f(0.0));
  let n = u.pose.z;
  let corner = pow(pow(m.x, n) + pow(m.y, n), 1.0 / n);
  return corner + min(max(q.x, q.y), 0.0) - r;
}

fn outward(p: vec2f) -> vec2f {
  let h = 0.25;
  let g = vec2f(
    cardDistance(p + vec2f(h, 0.0)) - cardDistance(p - vec2f(h, 0.0)),
    cardDistance(p + vec2f(0.0, h)) - cardDistance(p - vec2f(0.0, h)),
  );
  return g / max(length(g), 1e-5);
}

// The studio, seen along e: x right, y up, z towards the viewer. It has
// no hard edges: walls and a softbox with hard edges give the curve bands,
// which read as outlines at real size.
fn room(e: vec3f) -> vec3f {
  let dome = mix(vec3f(0.16, 0.16, 0.17), vec3f(0.58, 0.575, 0.57), smoothstep(-0.5, 0.9, e.y));
  let sb = normalize(vec3f(-0.34, 0.8, 0.5));
  return dome + vec3f(1.0, 0.97, 0.93) * pow(saturate(dot(e, sb)), 4.0);
}

// The strip light: a thin band high up behind the viewer's line of sight,
// which the steepest part of the curve turns towards the eye.
fn strip(e: vec3f) -> f32 {
  let elevation = asin(clamp(e.y, -1.0, 1.0));
  return 2.6 * (1.0 - smoothstep(0.03, 0.06, abs(elevation - 0.66))) * smoothstep(0.1, 0.5, -e.z);
}

fn fresnel(cosine: f32) -> f32 {
  return F0 + (1.0 - F0) * pow(1.0 - saturate(cosine), 5.0);
}

// What the glass adds to the card's colour at point p of the face, in
// linear light.
fn shine(p: vec2f, card: vec3f) -> vec3f {
  let d = cardDistance(p);
  let width = u.pose.w;
  if (d > 0.0 || d < -width) {
    return vec3f(0.0);
  }
  let s = -d / width;
  let slope = MAX_SLOPE * (1.0 - smoothstep(0.0, 1.0, s));
  let g = outward(p);
  let c = cos(u.pose.x);
  let sn = sin(u.pose.x);
  // The card's axes after the tilt, in CSS space: y down, z towards the
  // viewer. The tilt turns the card about its middle, top towards the eye.
  let ax = vec3f(1.0, 0.0, 0.0);
  let ay = vec3f(0.0, c, -sn);
  let az = vec3f(0.0, sn, c);
  let half = u.card.xy * 0.5;
  let x = vec3f(p.x, half.y + (p.y - half.y) * c, -(p.y - half.y) * sn);
  // The viewer is in front of the card's middle, further than the eye of
  // the CSS perspective, which sits over the card's top edge only to place
  // the tilt.
  let eye = vec3f(half.x, half.y, 2.0 * u.pose.y);
  let n = normalize((ax * g.x + ay * g.y) * sin(slope) + az * cos(slope));
  let toEye = normalize(eye - x);
  // On a very tall card the steepest curve near the far edge would turn
  // away from the viewer. Keep it just in view.
  let v = normalize(toEye + n * max(0.02 - dot(n, toEye), 0.0));
  let r = reflect(-v, n);
  let r0 = reflect(-v, az);
  let e = vec3f(r.x, -r.y, r.z);
  let e0 = vec3f(r0.x, -r0.y, r0.z);
  let f = fresnel(dot(n, v));
  let f0 = fresnel(dot(az, v));
  let brightness = u.look.z;
  let reflected = f * (room(e) * brightness - card) - f0 * (room(e0) * brightness - card);
  // A ring of shade or of light along the whole outline reads as a border
  // at real size. So the curve lights the card only, and mostly where the
  // light falls. A white card cannot show a lighter line, so there the
  // curve inside the line shades a little.
  let a = lit(p);
  let shade = a * smoothstep(0.2, 0.55, s) * SHADE * (f - f0) * card;
  return u.look.x * (max(reflected, vec3f(0.0)) * mix(0.08, 1.0, a) - shade) + vec3f(u.look.y * brightness * f * strip(e) * a);
}

// The part of the edge that the light falls on: the top left corner, from
// where it fades out along the top and down the left side.
fn lit(p: vec2f) -> f32 {
  let q = vec2f(p.x / (0.6 * u.card.x), p.y / 150.0);
  return 1.0 - smoothstep(0.2, 1.0, length(q));
}

@fragment
fn fs(@builtin(position) frag: vec4f) -> @location(0) vec4f {
  let dpr = u.view.w;
  let p = frag.xy / dpr - vec2f(u.view.z);
  let d = cardDistance(p);
  let px = 1.0 / dpr;
  if (d > 2.0 * px || d < -u.pose.w - 2.0 * px) {
    return vec4f(0.0);
  }
  let base = u.base.rgb;
  let card = pow(base, vec3f(GAMMA));
  let added = 0.25 * (
    shine(p + vec2f(-0.125, -0.375) * px, card) +
    shine(p + vec2f(0.375, -0.125) * px, card) +
    shine(p + vec2f(0.125, 0.375) * px, card) +
    shine(p + vec2f(-0.375, 0.125) * px, card)
  );
  let lit = pow(saturate(card + added), vec3f(1.0 / GAMMA));
  // The least veil that turns the card's colour into the target: white
  // where it is lighter, black where it is darker.
  let up = select(vec3f(0.0), (lit - base) / max(vec3f(1.0) - base, vec3f(1e-4)), lit > base);
  let down = select(vec3f(0.0), (base - lit) / max(base, vec3f(1e-4)), lit < base);
  let alpha = saturate(max(max(max(up.x, up.y), up.z), max(max(down.x, down.y), down.z)));
  if (alpha < 1e-4) {
    return vec4f(0.0);
  }
  let veil = saturate(base + (lit - base) / alpha);
  return vec4f(veil * alpha, alpha);
}
`;
