/**
 * The Sheet's ink dim: a small stable-fluids solver on a coarse grid, and
 * a pass that draws its ink as the dim's colour on the canvas.
 *
 * @internal
 */
export const INK_DIM_WGSL = /* wgsl */ `
struct Ink {
  grid: vec4f,   // width, height in cells, dt, time
  card: vec4f,   // the card's box in cells: x0, y0, x1, y1
  motion: vec4f, // the card's velocity in cells per s, corner radius in cells, progress
  drive: vec4f,  // emission, speed in cells per s, vorticity, dye loss per s
  tint: vec4f,   // the dim's colour and alpha
  look: vec4f,   // level, fill, fade, mode (0 open, 1 close)
  view: vec4f,   // canvas width, height in px, core, source
}

@group(0) @binding(0) var<uniform> u: Ink;
@group(0) @binding(1) var ta: texture_2d<f32>;
@group(0) @binding(2) var tb: texture_2d<f32>;
@group(0) @binding(3) var samp: sampler;

@vertex
fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  let p = vec2f(f32((i << 1u) & 2u), f32(i & 2u));
  return vec4f(p * 2.0 - 1.0, 0.0, 1.0);
}

fn size() -> vec2f { return u.grid.xy; }

fn ld(t: texture_2d<f32>, p: vec2f) -> vec4f {
  let c = clamp(vec2i(floor(p)), vec2i(0), vec2i(size()) - 1);
  return textureLoad(t, c, 0);
}

fn smp(t: texture_2d<f32>, p: vec2f) -> vec4f {
  return textureSampleLevel(t, samp, p / size(), 0.0);
}

fn hash(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}

fn noise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let w = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2f(1.0, 0.0)), w.x),
    mix(hash(i + vec2f(0.0, 1.0)), hash(i + vec2f(1.0, 1.0)), w.x),
    w.y,
  );
}

fn fbm(p: vec2f) -> f32 {
  return 0.5 * noise(p) + 0.3 * noise(p * 2.03 + 17.0) + 0.2 * noise(p * 4.01 + 41.0);
}

fn sdCard(p: vec2f) -> f32 {
  let c = (u.card.xy + u.card.zw) * 0.5;
  let h = max((u.card.zw - u.card.xy) * 0.5, vec2f(0.0));
  let r = min(u.motion.z, min(h.x, h.y));
  let q = abs(p - c) - h + r;
  return length(max(q, vec2f(0.0))) + min(max(q.x, q.y), 0.0) - r;
}

fn cardNormal(p: vec2f) -> vec2f {
  let e = 0.5;
  let g = vec2f(
    sdCard(p + vec2f(e, 0.0)) - sdCard(p - vec2f(e, 0.0)),
    sdCard(p + vec2f(0.0, e)) - sdCard(p - vec2f(0.0, e)),
  );
  return g / max(length(g), 1e-4);
}

// How strongly the edge of the card pushes ink out here: billows that
// drift along the edge, so the ink comes out in uneven lobes.
fn wobble(p: vec2f) -> f32 {
  let t = u.grid.w;
  return fbm(p * 0.07 + vec2f(t * 0.9, -t * 0.6));
}

// The few places along the edge where ink comes out as a jet.
fn jet(p: vec2f) -> f32 {
  return smoothstep(0.42, 0.68, wobble(p));
}

@fragment
fn fsCurl(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let p = pos.xy;
  let l = ld(ta, p - vec2f(1.0, 0.0)).y;
  let r = ld(ta, p + vec2f(1.0, 0.0)).y;
  let t = ld(ta, p - vec2f(0.0, 1.0)).x;
  let b = ld(ta, p + vec2f(0.0, 1.0)).x;
  return vec4f(0.5 * ((r - l) - (b - t)), 0.0, 0.0, 1.0);
}

@fragment
fn fsForces(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let p = pos.xy;
  let dt = u.grid.z;
  let cl = abs(ld(tb, p - vec2f(1.0, 0.0)).x);
  let cr = abs(ld(tb, p + vec2f(1.0, 0.0)).x);
  let ct = abs(ld(tb, p - vec2f(0.0, 1.0)).x);
  let cb = abs(ld(tb, p + vec2f(0.0, 1.0)).x);
  var n = 0.5 * vec2f(cr - cl, cb - ct);
  n = n / (length(n) + 1e-4);
  let c = ld(tb, p).x;
  var v = ld(ta, p).xy + u.drive.z * c * vec2f(n.y, -n.x) * dt;
  let sd = sdCard(p);
  if (u.look.w < 0.5 && sd >= 0.0) {
    let k = u.drive.x * exp(-sd / 3.0);
    let goal = cardNormal(p) * u.drive.y * (0.25 + 1.5 * wobble(p)) + u.motion.xy;
    v = mix(v, goal, clamp(k * 0.25, 0.0, 1.0));
  }
  if (sd < 0.0) {
    v = u.motion.xy * select(1.0, 0.4, u.look.w > 0.5);
  }
  return vec4f(v, 0.0, 1.0);
}

@fragment
fn fsDiv(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let p = pos.xy;
  let l = ld(ta, p - vec2f(1.0, 0.0)).x;
  let r = ld(ta, p + vec2f(1.0, 0.0)).x;
  let t = ld(ta, p - vec2f(0.0, 1.0)).y;
  let b = ld(ta, p + vec2f(0.0, 1.0)).y;
  var div = 0.5 * ((r - l) + (b - t));
  // Ink comes into the water at the card's edge, so the solve keeps the
  // flow out of the edge.
  if (u.look.w < 0.5) {
    let sd = sdCard(p);
    if (sd >= 0.0) {
      div = div - u.drive.x * u.view.w * exp(-sd / 2.5) * (0.15 + 2.2 * jet(p));
    }
  }
  return vec4f(div, 0.0, 0.0, 1.0);
}

@fragment
fn fsPressure(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let p = pos.xy;
  let l = ld(ta, p - vec2f(1.0, 0.0)).x;
  let r = ld(ta, p + vec2f(1.0, 0.0)).x;
  let t = ld(ta, p - vec2f(0.0, 1.0)).x;
  let b = ld(ta, p + vec2f(0.0, 1.0)).x;
  return vec4f((l + r + t + b - ld(tb, p).x) * 0.25, 0.0, 0.0, 1.0);
}

@fragment
fn fsGrad(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let p = pos.xy;
  let l = ld(ta, p - vec2f(1.0, 0.0)).x;
  let r = ld(ta, p + vec2f(1.0, 0.0)).x;
  let t = ld(ta, p - vec2f(0.0, 1.0)).x;
  let b = ld(ta, p + vec2f(0.0, 1.0)).x;
  let v = ld(tb, p).xy - 0.5 * vec2f(r - l, b - t);
  return vec4f(v, 0.0, 1.0);
}

@fragment
fn fsAdvectVel(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let p = pos.xy;
  let dt = u.grid.z;
  let back = p - dt * ld(ta, p).xy;
  return vec4f(smp(ta, back).xy * exp(-dt * 0.6), 0.0, 1.0);
}

@fragment
fn fsAdvectDye(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let p = pos.xy;
  let dt = u.grid.z;
  let back = p - dt * ld(ta, p).xy;
  var d = smp(tb, back).x;
  let sd = sdCard(p);
  if (u.look.w < 0.5) {
    let k = u.drive.x * exp(-max(sd, 0.0) / 2.0);
    d = d + k * (0.05 + 2.2 * jet(p)) * dt * 10.0;
    d = min(d, 1.3);
  } else {
    d = max(d - u.drive.w * dt, 0.0);
  }
  return vec4f(d, 0.0, 0.0, 1.0);
}

// The close starts from a full, mottled dim: the thin places clear first.
@fragment
fn fsInitDye(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let p = pos.xy;
  let seed = vec2f(u.grid.w * 13.1, u.grid.w * 7.3);
  let m = 0.6 * fbm(p * 0.035 + seed) + 0.4 * fbm(p * 0.09 + seed * 1.7);
  let k = smoothstep(0.3, 0.75, m);
  return vec4f(1.0 + 1.2 * k, 0.0, 0.0, 1.0);
}

// A divergence-free swirl from the curl of a noise stream function.
@fragment
fn fsInitVel(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let p = pos.xy * 0.03 + vec2f(u.grid.w * 3.7, 11.0);
  let e = 0.05;
  let dx = fbm(p + vec2f(e, 0.0)) - fbm(p - vec2f(e, 0.0));
  let dy = fbm(p + vec2f(0.0, e)) - fbm(p - vec2f(0.0, e));
  let v = vec2f(dy, -dx) / (2.0 * e) * u.drive.y;
  return vec4f(v, 0.0, 1.0);
}

// A cubic B-spline from four bilinear taps, so the coarse grid shows no
// creases when it is drawn large.
fn cubic(p: vec2f) -> f32 {
  let t = p - 0.5;
  let f = fract(t);
  let i = floor(t);
  let f2 = f * f;
  let f3 = f2 * f;
  let w0 = (1.0 - 3.0 * f + 3.0 * f2 - f3) / 6.0;
  let w1 = (4.0 - 6.0 * f2 + 3.0 * f3) / 6.0;
  let w2 = (1.0 + 3.0 * f + 3.0 * f2 - 3.0 * f3) / 6.0;
  let w3 = f3 / 6.0;
  let g0 = w0 + w1;
  let g1 = w2 + w3;
  let h0 = i - 0.5 + w1 / g0;
  let h1 = i + 1.5 + w3 / g1;
  let a = smp(ta, vec2f(h0.x, h0.y)).x;
  let b = smp(ta, vec2f(h1.x, h0.y)).x;
  let c = smp(ta, vec2f(h0.x, h1.y)).x;
  let d = smp(ta, vec2f(h1.x, h1.y)).x;
  return g0.y * (g0.x * a + g1.x * b) + g1.y * (g0.x * c + g1.x * d);
}

@fragment
fn fsDisplay(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let p = pos.xy / u.view.xy * size();
  let d = cubic(p);
  let ink = smoothstep(0.02, 0.95, d) * (1.0 + u.view.z * smoothstep(1.0, 1.8, d));
  var cover: f32;
  if (u.look.w < 0.5) {
    // No ink under the card while it comes in: it can be see-through then.
    let clear = smoothstep(-0.5, 1.5, sdCard(p));
    cover = mix(ink * clear, 1.0, u.look.y);
  } else {
    cover = ink * u.look.z;
  }
  let a = u.tint.a * u.look.x * cover;
  return vec4f(u.tint.rgb * a, a);
}
`;
