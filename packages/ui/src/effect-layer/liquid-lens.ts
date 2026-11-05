import { d, std } from "typegpu";
import { FLAG_SEE_THROUGH } from "./liquid-instance-value.ts";
import type { Surface } from "./liquid-surface.ts";
import { targetLayout } from "./target-layout.ts";
import { frameDir, type Liquid, type Track } from "./to-track-frame.ts";
import { trackAt } from "./track-at.ts";

/** The body's dome: a spherical cap this high, as a share of the radius. */
const DOME = 0.85;
/**
 * The index of refraction. Water's is 1.33; higher here, so that the bend
 * shows at the thumb's size.
 */
const INDEX = 2.2;
/** The rim: the steep surface reflects the room, brightest at the edge. */
const RIM_LIGHT = 0.9;
const RIM_POWER = 12;
/** The contact line: a thin dark line where the surface meets the track. */
const LIMB = 0.22;
const LIMB_WIDTH = 1;
const HIGHLIGHT = 1;
const GLEAM = 0.22;
/**
 * The caustic: light the dome gathers onto the track on the side away from
 * the light, in a band this far inside the rim, as a share of the radius.
 */
const CAUSTIC = 0.3;
const CAUSTIC_DEPTH = 0.14;
const CAUSTIC_WIDTH = 0.08;
/** The track seen through the body: a wet surface is a little darker. */
const WET = 0.95;
const SHADE = 0.05;

/**
 * The surface melts from the rim inward and sets from the centre out, with
 * an edge this wide as a share of the radius.
 */
const MELT_WIDTH = 0.6;

/** @internal */
export const TO_LIGHT = std.normalize(d.vec3f(-0.42, -0.66, 0.62));
const TO_LIGHT_FLAT = std.normalize(TO_LIGHT.xy);
const HALFWAY = std.normalize(TO_LIGHT.add(d.vec3f(0, 0, 1)));
const GLEAM_HALFWAY = std.normalize(
  d.vec3f(-TO_LIGHT.x, -TO_LIGHT.y, TO_LIGHT.z).add(d.vec3f(0, 0, 1)),
);

/**
 * The dome of water over a point: its normal, where the light that leaves
 * this point for the eye came through the track, from this point, the
 * water's height here as a share of the dome's, and how much of the room
 * the surface reflects here: 1 at the rim.
 */
const Dome = d.struct({
  normal: d.vec3f,
  bend: d.vec2f,
  height: d.f32,
  rim: d.f32,
});

/**
 * The dome of water over a point `depth` inside the surface of a body of
 * `radius`: a spherical cap, with the way light takes through it. The ray
 * bends towards the normal as it enters the water, so the track shows
 * magnified.
 */
const domeAt = (depth: number, radius: number, outward: d.v2f) => {
  "use gpu";
  const top = DOME * radius;
  const sphere = (radius * radius + top * top) / (2 * top);
  const r = std.clamp(radius - depth, 0, radius);
  const height = std.sqrt(std.max(sphere * sphere - r * r, 0)) - (sphere - top);
  const sinTheta = r / sphere;
  const cosTheta = std.sqrt(1 - sinTheta * sinTheta);
  const cosRim = std.sqrt(1 - (radius * radius) / (sphere * sphere));
  const theta = std.asin(sinTheta);
  const phi = std.asin(sinTheta / INDEX);
  return Dome({
    normal: d.vec3f(outward.mul(sinTheta), cosTheta),
    bend: outward.mul(-height * std.tan(theta - phi)),
    height: height / top,
    rim: std.pow((1 - cosTheta) / (1 - cosRim), RIM_POWER),
  });
};

/**
 * How solid a point this far into the body is, from 0 at the rim to 1 at
 * the centre, as the body sets: the surface melts from the rim inward and
 * sets from the centre out.
 *
 * @internal
 */
export const solidAt = (inward: number, firm: number) => {
  "use gpu";
  const threshold = (1 - firm) * (1 + MELT_WIDTH) - MELT_WIDTH;
  return std.smoothstep(threshold, threshold + MELT_WIDTH, inward);
};

/**
 * The solid surface as the control draws it at rest: its colour, with its
 * inset ring and its top light in dark. `above` is the distance from the
 * surface 1 px up.
 *
 * @internal
 */
export const solidBody = (liquid: Liquid, distance: number, above: number) => {
  "use gpu";
  if (liquid.edge.w <= 0) {
    return d.vec3f(liquid.thumb);
  }
  const pixel = targetLayout.$.effectTarget.pixelScale.x;
  const ring = liquid.edge.w * std.saturate(0.5 + (1 + distance) * pixel);
  const top = 0.6 * liquid.edge.w * std.saturate(0.5 + above * pixel);
  return std.mix(liquid.thumb, d.vec3f(1), std.saturate(ring + top));
};

/**
 * A drop of water over the track: the track as it shows through the dome,
 * lit by a thin rim, a highlight and a caustic, and solid as far as it has
 * set.
 */
const lens = (
  liquid: Liquid,
  track: Track,
  page: d.v2f,
  surface: Surface,
  radius: number,
  solid: number,
  solidColor: d.v3f,
) => {
  "use gpu";
  if (solid >= 1) {
    return d.vec3f(solidColor);
  }
  const depth = -surface.signedDistance;
  const dome = domeAt(depth, radius, surface.outward);
  const normal = dome.normal;
  const away = std.saturate(
    -std.dot(surface.outward, frameDir(liquid, d.vec3f(TO_LIGHT_FLAT, 0)).xy),
  );
  const band = (depth / radius - CAUSTIC_DEPTH) / CAUSTIC_WIDTH;
  // Water in front of the page does not darken it.
  const dry = (liquid.flags & FLAG_SEE_THROUGH) !== 0;
  const behind = trackAt(liquid, track, page.add(dome.bend)).mul(
    std.select(WET, 1, dry) * (1 + away * std.exp(-band * band) * CAUSTIC),
  );
  let color = behind.mul(
    1 -
      std.saturate(-std.dot(normal.xy, frameDir(liquid, TO_LIGHT).xy)) *
        std.select(SHADE, 0, dry),
  );
  color = color.mul(1 - LIMB * (1 - std.smoothstep(0, LIMB_WIDTH, depth)));
  color = std.mix(color, d.vec3f(1), dome.rim * RIM_LIGHT);
  const lit = std.max(std.dot(normal, frameDir(liquid, HALFWAY)), 0);
  const highlight = std.pow(lit, 120) + 0.05 * std.pow(lit, 16);
  color = std.mix(color, d.vec3f(1), std.saturate(highlight) * HIGHLIGHT);
  // A second, fainter gleam on the far side: the room reflected.
  const gleam = std.pow(
    std.max(std.dot(normal, frameDir(liquid, GLEAM_HALFWAY)), 0),
    40,
  );
  color = std.mix(color, d.vec3f(1), gleam * GLEAM);
  if (solid <= 0) {
    return std.saturate(color);
  }
  return std.mix(std.saturate(color), solidColor, solid);
};

/** @internal */
export { lens as liquidLens };
