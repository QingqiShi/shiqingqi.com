import { d, std, tgpu } from "typegpu";
import {
  DUST,
  DUST_MOTES_PER_ELEMENT,
  DUST_QUAD_VERTICES,
} from "./dust-element-value.ts";
import { DUST_BURST, DUST_ON_VIEWPORT, dustLayout } from "./dust-layout.ts";
import { dustPagePosition } from "./dust-page-position.ts";
import { edgePoint } from "./edge-point.ts";
import { effectClip } from "./effect-clip.ts";
import { effectGrayscale } from "./effect-element-distance.ts";
import { fragmentToPage, pageToClip, stripCorner } from "./element-quad.ts";
import { pageLayout } from "./page-layout.ts";
import { pcg, random } from "./pcg.ts";
import { PAGE_SCOPE } from "./plan-scopes.ts";
import { targetLayout } from "./target-layout.ts";

const RADIUS_MIN = 0.6;
const RADIUS_MAX = 1.5;
/** A burst sheds larger particles, so the few of them read at a glance. */
const BURST_RADIUS_SCALE = 1.6;
/** How far a particle's streak reaches back, as the seconds it travels. */
const STREAK_SECONDS = 0.035;
const STREAK_MAX = 22;
const FADE_IN = 0.9;
const BURST_FADE_IN = 0.08;
const FADE_OUT = 1.6;
const FLICKER = 0.25;
const MOTE_SPREAD = 26;
/**
 * The longest streak and the widest dot, so a particle just past the drawn
 * part of a band still draws the part of it inside.
 */
const DRAWN_MARGIN = STREAK_MAX + RADIUS_MAX * BURST_RADIUS_SCALE + 1;

/**
 * What each vertex passes on: `local` is CSS px from the head of the
 * particle, along and across its motion; `shape` the radius and the streak
 * length, CSS px; `color` premultiplied.
 */
const dustVarying = {
  position: d.builtin.position,
  local: d.vec2f,
  shape: d.interpolate("flat", d.vec2f),
  color: d.interpolate("flat", d.vec4f),
  scope: d.interpolate("flat", d.u32),
};

/** A vertex outside clip space, so its quad draws nothing. */
const CULLED = {
  position: d.vec4f(2, 2, 2, 1),
  local: d.vec2f(),
  shape: d.vec2f(),
  color: d.vec4f(),
  scope: PAGE_SCOPE,
};

const quadCorners = tgpu.privateVar(
  d.arrayOf(d.u32, DUST_QUAD_VERTICES),
  [0, 1, 2, 2, 1, 3],
);

const QuadCorner = d.struct({ position: d.vec4f, local: d.vec2f });

/** The corner of this vertex of a dot at `head`, with its streak behind it. */
const quadCorner = tgpu.fn(
  [d.u32, d.vec2f, d.vec2f, d.f32, d.f32],
  QuadCorner,
)((vertex, head, direction, radius, streak) => {
  "use gpu";
  const index = quadCorners.$[vertex % DUST_QUAD_VERTICES];
  const corner = stripCorner(index);
  const pad = radius + 1;
  const local = d.vec2f(
    std.mix(-streak - pad, pad, corner.x),
    std.mix(-pad, pad, corner.y),
  );
  const page = head
    .add(direction.mul(local.x))
    .add(d.vec2f(-direction.y, direction.x).mul(local.y));
  return QuadCorner({ position: pageToClip(page), local });
});

const shade = tgpu.fn(
  [d.u32, d.f32, d.f32],
  d.vec4f,
)((packed, grayscale, opacity) => {
  "use gpu";
  const color = std.unpack4x8unorm(packed);
  return d
    .vec4f(effectGrayscale(color.rgb, grayscale), 1)
    .mul(color.a)
    .mul(opacity);
});

/**
 * Each live particle as a soft dot, stretched along its velocity as it
 * speeds up. The first instance of a draw picks the dust that draws over a
 * light backdrop, 0, or a dark one, 1, and 2 more picks the dust that stays
 * on the viewport.
 */
const particleVertex = tgpu.vertexFn({
  in: { vertex: d.builtin.vertexIndex, instance: d.builtin.instanceIndex },
  out: dustVarying,
})((input) => {
  "use gpu";
  const particle =
    dustLayout.$.particles[std.intdiv(input.vertex, DUST_QUAD_VERTICES)];
  const drawn = targetLayout.$.effectTarget.drawnPageRange;
  const head = dustPagePosition(particle);
  const y = head.y;
  const onViewport = (particle.flags & DUST_ON_VIEWPORT) !== 0;
  if (
    particle.age >= particle.life ||
    particle.dark !== (input.instance & 1) ||
    onViewport !== ((input.instance & 2) !== 0) ||
    y < drawn.x - DRAWN_MARGIN ||
    y > drawn.y + DRAWN_MARGIN
  ) {
    return CULLED;
  }
  const speed = std.length(particle.velocity);
  const direction = std.select(
    d.vec2f(1, 0),
    particle.velocity.div(speed),
    speed > 1e-3,
  );
  const isBurst = (particle.flags & DUST_BURST) !== 0;
  const radius =
    std.mix(RADIUS_MIN, RADIUS_MAX, particle.seed * particle.seed) *
    std.select(d.f32(1), d.f32(BURST_RADIUS_SCALE), isBurst);
  const streak = std.min(speed * STREAK_SECONDS, STREAK_MAX);
  const flicker =
    1 -
    FLICKER *
      (0.5 +
        0.5 *
          std.sin(pageLayout.$.effectPage.seconds * 1.7 + particle.seed * 40));
  const opacity =
    (std.smoothstep(
      0,
      std.select(d.f32(FADE_IN), d.f32(BURST_FADE_IN), isBurst),
      particle.age,
    ) *
      std.smoothstep(0, FADE_OUT, particle.life - particle.age) *
      particle.intake *
      flicker *
      std.mix(0.55, 1, std.fract(particle.seed * 7.31)) *
      (radius + 1)) /
    (radius + 1 + streak * 0.08);
  const corner = quadCorner(input.vertex, head, direction, radius, streak);
  return {
    position: corner.position,
    local: corner.local,
    shape: d.vec2f(radius, streak),
    color: shade(particle.color, particle.grayscale, opacity),
    scope: particle.scopeIndex,
  };
});

/**
 * Under reduced motion, still motes around each element that sheds dust.
 * The first instance picks the backdrop, as for `particleVertex`.
 */
const moteVertex = tgpu.vertexFn({
  in: { vertex: d.builtin.vertexIndex, dark: d.builtin.instanceIndex },
  out: dustVarying,
})((input) => {
  "use gpu";
  const index = std.intdiv(input.vertex, DUST_QUAD_VERTICES);
  const elementIndex = std.intdiv(index, DUST_MOTES_PER_ELEMENT);
  const element = pageLayout.$.effectElements[elementIndex];
  const dust = dustLayout.$.dustElements[elementIndex];
  if ((element.roles & DUST) === 0 || dust.dark !== input.dark) {
    return CULLED;
  }
  const mote = index % DUST_MOTES_PER_ELEMENT;
  const state = d.ref(pcg(element.id * 7919 + mote));
  // Each mote has its own share of the edge, so each side gets motes.
  const edge = edgePoint(
    element,
    (d.f32(mote) + random(state)) / DUST_MOTES_PER_ELEMENT,
  );
  const spread = random(state);
  const head = edge.position.add(
    edge.normal.mul(2 + spread * spread * MOTE_SPREAD),
  );
  const seed = random(state);
  const radius = std.mix(RADIUS_MIN, RADIUS_MAX, seed * seed);
  const opacity = (1 - spread) * 0.8;
  const corner = quadCorner(input.vertex, head, d.vec2f(1, 0), radius, 0);
  return {
    position: corner.position,
    local: corner.local,
    shape: d.vec2f(radius, 0),
    color: shade(dust.color, element.grayscale, opacity),
    scope: element.scope,
  };
});

/** A dot with its streak, clipped to its Effect container. */
const dustFragment = tgpu.fragmentFn({
  in: dustVarying,
  out: d.vec4f,
})((input) => {
  "use gpu";
  const along = std.clamp(input.local.x, -input.shape.y, 0);
  // The tail narrows and fades from the head back, so a fast particle reads
  // as a comet.
  const tail = along / std.min(-input.shape.y, -1e-3);
  const radius = input.shape.x * (1 - 0.6 * tail);
  const distance = std.length(input.local.sub(d.vec2f(along, 0))) - radius;
  const pixel = 1 / targetLayout.$.effectTarget.pixelScale.x;
  const coverage = 1 - std.smoothstep(-pixel * 0.5, pixel * 0.5, distance);
  if (coverage <= 0) {
    return d.vec4f(0);
  }
  return input.color
    .mul(coverage)
    .mul(1 - tail)
    .mul(effectClip(input.scope, fragmentToPage(input.position.xy)));
});

/**
 * The render shaders of the Dust effect: `particleVertex` draws the live
 * particles, `moteVertex` the still motes under reduced motion, both with
 * `fragment`, as a triangle list of `DUST_QUAD_VERTICES` vertices a quad.
 *
 * @internal
 */
export const dustShader = {
  particleVertex,
  moteVertex,
  fragment: dustFragment,
};
