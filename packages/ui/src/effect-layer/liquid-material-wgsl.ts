/**
 * The look of the liquid, which every effect of the family draws with: a
 * dome of water over a surface, which bends what shows through it and is
 * lit by a thin rim, a highlight and a caustic; the way a body sets from
 * its core to its rim; and the lit bevel of the solid surface at rest.
 * Each function takes a surface as a distance and an outward normal, so
 * the Liquid effect draws a thumb with it and the Sheet edge a wave. Put it
 * after `TARGET_WGSL` in a render shader.
 *
 * @internal
 */
export const LIQUID_MATERIAL_WGSL = /* wgsl */ `
// The body's dome: a spherical cap this high, as a share of the radius.
const DOME = 0.85;
// The index of refraction. Water's is 1.33; higher here, so that the bend
// shows at the thumb's size.
const INDEX = 2.2;
// The rim: the steep surface reflects the room, brightest at the edge.
const RIM_LIGHT = 0.9;
const RIM_POWER = 12.0;
// The contact line: a thin dark line where the surface meets the track.
const LIMB = 0.22;
const LIMB_WIDTH = 1.0;
const HIGHLIGHT = 1.0;
const GLEAM = 0.22;
// The caustic: light the dome gathers onto the track on the side away
// from the light, in a band this far inside the rim, as a share of the
// radius.
const CAUSTIC = 0.3;
const CAUSTIC_DEPTH = 0.14;
const CAUSTIC_WIDTH = 0.08;
// The track seen through the body: a wet surface is a little darker.
const WET = 0.95;
const SHADE = 0.05;
// The surface melts from the rim inward and sets from the centre out, with
// an edge this wide as a share of the radius.
const MELT_WIDTH = 0.6;
const TO_LIGHT = normalize(vec3f(-0.42, -0.66, 0.62));
const TO_LIGHT_FLAT = normalize(TO_LIGHT.xy);
const HALFWAY = normalize(TO_LIGHT + vec3f(0.0, 0.0, 1.0));
const GLEAM_HALFWAY = normalize(vec3f(-TO_LIGHT.xy, TO_LIGHT.z) + vec3f(0.0, 0.0, 1.0));

struct Surface {
  // Below zero inside, in CSS px.
  distance: f32,
  outward: vec2f,
}

fn premultiplied(color: vec4f) -> vec4f {
  return vec4f(color.rgb * color.a, color.a);
}

fn over(top: vec4f, under: vec4f) -> vec4f {
  return top + under * (1.0 - top.a);
}

// The dome of water over a point depth inside the surface of a body of
// radius: a spherical cap, with the way light takes through it.
struct Dome {
  normal: vec3f,
  // Where the light that leaves this point for the eye came through the
  // track, from this point: the ray bends towards the normal as it enters
  // the water, so the track shows magnified.
  bend: vec2f,
  // The water's height here, as a share of the dome's.
  height: f32,
  // How much of the room the surface reflects here: 1 at the rim.
  rim: f32,
}

fn domeAt(depth: f32, radius: f32, outward: vec2f) -> Dome {
  let top = DOME * radius;
  let sphere = (radius * radius + top * top) / (2.0 * top);
  let r = clamp(radius - depth, 0.0, radius);
  let height = sqrt(max(sphere * sphere - r * r, 0.0)) - (sphere - top);
  let sinTheta = r / sphere;
  let cosTheta = sqrt(1.0 - sinTheta * sinTheta);
  let cosRim = sqrt(1.0 - (radius * radius) / (sphere * sphere));
  let theta = asin(sinTheta);
  let phi = asin(sinTheta / INDEX);
  return Dome(
    vec3f(outward * sinTheta, cosTheta),
    -outward * height * tan(theta - phi),
    height / top,
    pow((1.0 - cosTheta) / (1.0 - cosRim), RIM_POWER),
  );
}

// What shows through the dome at a point depth inside a body of radius,
// over what is behind it: a wet surface is a little darker, the dome
// gathers a caustic on the side away from the light and shades the side
// towards it, a dark contact line runs round the rim, and the steep rim,
// a highlight and a fainter gleam reflect the room. Water in front of the
// page, dry, does not darken it.
fn wetShade(behind: vec3f, dome: Dome, outward: vec2f, depth: f32, radius: f32, dry: bool) -> vec3f {
  let normal = dome.normal;
  let away = saturate(-dot(outward, TO_LIGHT_FLAT));
  let band = (depth / radius - CAUSTIC_DEPTH) / CAUSTIC_WIDTH;
  let seen = behind * select(WET, 1.0, dry) * (1.0 + away * exp(-band * band) * CAUSTIC);
  var color = seen * (1.0 - saturate(-dot(normal.xy, TO_LIGHT.xy)) * select(SHADE, 0.0, dry));
  color *= 1.0 - LIMB * (1.0 - smoothstep(0.0, LIMB_WIDTH, depth));
  color = mix(color, vec3f(1.0), dome.rim * RIM_LIGHT);
  let lit = max(dot(normal, HALFWAY), 0.0);
  let highlight = pow(lit, 120.0) + 0.05 * pow(lit, 16.0);
  color = mix(color, vec3f(1.0), saturate(highlight) * HIGHLIGHT);
  // A second, fainter gleam on the far side: the room reflected.
  let gleam = pow(max(dot(normal, GLEAM_HALFWAY), 0.0), 40.0);
  color = mix(color, vec3f(1.0), gleam * GLEAM);
  return saturate(color);
}

// How solid a point this far into the body is, from 0 at the rim to 1 at
// the centre, as the body sets: the surface melts from the rim inward and
// sets from the centre out.
fn solidAt(inward: f32, firm: f32) -> f32 {
  let threshold = (1.0 - firm) * (1.0 + MELT_WIDTH) - MELT_WIDTH;
  return smoothstep(threshold, threshold + MELT_WIDTH, inward);
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
`;
