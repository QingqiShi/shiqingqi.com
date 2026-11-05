import { d, std } from "typegpu";
import { FLAG_LIGHT_BODY } from "./liquid-instance-value.ts";
import { frameDir, pageUp, type Liquid } from "./to-track-frame.ts";

/**
 * The lit edge: how bright its hairline is where the edge faces the light,
 * and how fast it dims as the edge turns away. Then how bright its glint is
 * where the rim faces the light, and how small the glint is. The light is
 * this far above the body, as a share of the radius.
 */
const HAIRLINE = 0.12;
const HAIRLINE_SHINE = 1.5;
const GLINT = 0.6;
const GLINT_SHINE = 40;
const LIGHT_HEIGHT = 1.5;
/**
 * The glint's halo on the track: how bright it starts and how far it
 * reaches, in CSS px.
 */
const BLOOM = 0.45;
const BLOOM_REACH = 0.8;
/**
 * On a light surface, the sheen starts this far outside the edge, past the
 * ring. It fades over this many CSS px. These are its brightness for the
 * hairline and for the glint.
 */
const RING_CLEAR = 0.75;
const SHEEN_REACH = 2;
const SHEEN_HAIRLINE = 2.5;
const SHEEN_GLINT = 1.6;

/** @internal */
export const over = (top: d.v4f, under: d.v4f) => {
  "use gpu";
  return top.add(under.mul(1 - top.w));
};

/**
 * The light over the body: above its top on the page, and across the page
 * as far as `lean` says, between the sides of the body. It never comes down
 * past the top, so no part of the rim under the body's middle faces it.
 */
const lightOver = (liquid: Liquid) => {
  "use gpu";
  const half = d.vec2f(liquid.span + liquid.radius, liquid.radius);
  const right = frameDir(liquid, d.vec3f(1, 0, 0)).xy;
  const up = pageUp(liquid);
  return liquid.origin
    .add(d.vec2f(liquid.restX, 0))
    .add(right.mul(std.dot(right, half) * liquid.lean))
    .sub(up.mul(std.dot(up, half) + LIGHT_HEIGHT * liquid.radius));
};

/**
 * A glass bevel under a light above it: a quiet hairline on the sides that
 * face the light, which spills a little onto the track, a small glint where
 * the rim faces it, and a faint inner shade on the far side. On a light
 * surface a white hairline would hide the ring round it, so there the light
 * is only a soft sheen on the track, outside the ring.
 *
 * @internal
 */
export const litEdge = (
  acc: d.v4f,
  page: d.v2f,
  distance: number,
  outward: d.v2f,
  liquid: Liquid,
  extras: number,
) => {
  "use gpu";
  const facing = std.dot(outward, std.normalize(lightOver(liquid).sub(page)));
  const inner = std.saturate(1 + distance / 1.25) * std.step(distance, 0);
  const edgeBand = std.select(
    std.saturate(1 - distance / 0.75),
    inner,
    distance < 0,
  );
  const bloom = std.select(
    d.f32(0),
    BLOOM * std.exp(-distance / BLOOM_REACH),
    distance > 0,
  );
  const hairline = HAIRLINE * std.pow(std.saturate(facing), HAIRLINE_SHINE);
  const glint = GLINT * std.pow(std.saturate(facing), GLINT_SHINE);
  const shade = std.pow(std.saturate(-facing), 1.5) * inner;
  const lightBody = (liquid.flags & FLAG_LIGHT_BODY) !== 0;
  const dark = std.select(0.32, 0.06, lightBody) * shade * extras;
  let shine = hairline * edgeBand + glint * (inner + bloom);
  if (lightBody) {
    const sheen =
      std.smoothstep(RING_CLEAR, RING_CLEAR + 1, distance) *
      std.exp(-(distance - RING_CLEAR) / SHEEN_REACH);
    shine = (SHEEN_HAIRLINE * hairline + SHEEN_GLINT * glint) * sheen;
  }
  shine = std.saturate(shine * extras);
  return over(
    d.vec4f(d.vec3f(shine), shine),
    over(d.vec4f(0, 0, 0, dark), acc),
  );
};
