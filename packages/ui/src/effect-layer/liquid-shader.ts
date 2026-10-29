import { d, std, tgpu } from "typegpu";
import { effectClip } from "./effect-clip.ts";
import {
  effectElementDistance,
  effectGrayscale,
} from "./effect-element-distance.ts";
import {
  elementQuad,
  fragmentToPage,
  instancedQuadIn,
  instancedQuadVarying,
} from "./element-quad.ts";
import {
  FLAG_COVER,
  FLAG_LIGHT_BODY,
  FLAG_SEE_THROUGH,
  FLAG_VERTICAL,
} from "./liquid-instance-value.ts";
import { LiquidInstance, liquidLayout } from "./liquid-layout.ts";
import { EffectElement, pageLayout } from "./page-layout.ts";
import { KERNEL_REACH, NECK_REACH } from "./step-liquid.ts";
import { targetLayout } from "./target-layout.ts";

/**
 * The reach of a particle in the drawn field, as a share of the rest
 * radius: wider than the simulation's, so that the surface is smooth.
 */
const FIELD_REACH = KERNEL_REACH * 1.5;
/**
 * The field's value on the surface: where the liquid at rest has the
 * thumb's radius, measured on the simulation's rest state.
 */
const FIELD_THRESHOLD = 9.93;

const BEAD_JOIN = 1;
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
 * The most of the page that the set part of a body in front of it covers,
 * so the labels under it stay legible.
 */
const SEE_THROUGH_COVER = 0.5;
const SHADOW_REACH = 3;
const SHADOW = 0.18;
/**
 * The surface melts from the rim inward and sets from the centre out, with
 * an edge this wide as a share of the radius.
 */
const MELT_WIDTH = 0.6;
/**
 * How far the on fill rises ahead under the liquid along the track and
 * across it, as a share of the radius.
 */
const RISE_REACH = d.vec2f(1.9, 1.3);
/** How far ahead of the rest of the track the on fill rises under the liquid. */
const RISE_LEAD = 0.6;
/** The track's edge as it shows through the liquid, darker than the fill. */
const EDGE_SHADE = 0.3;
/**
 * The lit edge: how bright its hairline is where the edge faces the light,
 * and how fast it dims as the edge turns away. Then how bright its glint is
 * where the rim faces the light, and where it faces straight away, and how
 * small the glint is.
 */
const HAIRLINE = 0.12;
const HAIRLINE_SHINE = 1.5;
const GLINT = 0.7;
const COUNTER_GLINT = 0.22;
const GLINT_SHINE = 40;
/**
 * At its full lift, the glint is this much brighter, and it slides this far
 * along the rim, in radians.
 */
const GLINT_LIFT = 1;
const GLINT_SLIDE = 0.5;
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
const SHEEN_GLINT = 0.9;
const TO_LIGHT = std.normalize(d.vec3f(-0.42, -0.66, 0.62));
const TO_LIGHT_FLAT = std.normalize(TO_LIGHT.xy);
const HALFWAY = std.normalize(TO_LIGHT.add(d.vec3f(0, 0, 1)));
const GLEAM_HALFWAY = std.normalize(
  d.vec3f(-TO_LIGHT.x, -TO_LIGHT.y, TO_LIGHT.z).add(d.vec3f(0, 0, 1)),
);

type Liquid = d.Infer<typeof LiquidInstance>;
type Track = d.Infer<typeof EffectElement>;

/** A surface at a point: the signed distance to it, below zero inside, in CSS px, and its outward normal. */
const Surface = d.struct({ signedDistance: d.f32, outward: d.vec2f });
type Surface = d.Infer<typeof Surface>;

/**
 * The liquid's surface, with the radius of the dome over it, which runs
 * from the body's to a bead's through the neck between them.
 */
const LiquidSurface = d.struct({ surface: Surface, radius: d.f32 });

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

const isVertical = (liquid: Liquid) => {
  "use gpu";
  return (liquid.flags & FLAG_VERTICAL) !== 0;
};

/**
 * A vertical track draws in its own frame: the page turned over the
 * diagonal through the origin, so that the liquid runs along x there as on
 * a horizontal track. The turn is its own inverse.
 */
const toTrackFrame = (liquid: Liquid, page: d.v2f) => {
  "use gpu";
  return std.select(
    page,
    liquid.origin.add(page.sub(liquid.origin).yx),
    isVertical(liquid),
  );
};

const trackInFrame = (liquid: Liquid, track: Track) => {
  "use gpu";
  const turned = EffectElement(track);
  if (isVertical(liquid)) {
    turned.rect = d.vec4f(toTrackFrame(liquid, track.rect.xy), track.rect.wz);
    turned.radii = track.radii.xwzy;
  }
  return turned;
};

/** A direction on the page, such as the way to the light, in the track's frame. */
const frameDir = (liquid: Liquid, page: d.v3f) => {
  "use gpu";
  return std.select(page, page.yxz, isVertical(liquid));
};

/** One CSS px up the page, in the track's frame. */
const pageUp = (liquid: Liquid) => {
  "use gpu";
  return frameDir(liquid, d.vec3f(0, 1, 0)).xy;
};

/** The quad of one instance, over its track, corner by corner as a triangle strip. */
const liquidVertex = tgpu.vertexFn({
  in: instancedQuadIn,
  out: instancedQuadVarying,
})((input) => {
  "use gpu";
  const element =
    pageLayout.$.effectElements[liquidLayout.$.liquids[input.instance].element];
  return {
    position: elementQuad(input.vertex, element, 0),
    instance: input.instance,
  };
});

/**
 * How far the on fill has risen at a page point: further under the liquid
 * than on the rest of the track, with no edge between them.
 */
const risenAt = (liquid: Liquid, page: d.v2f) => {
  "use gpu";
  const reach = RISE_REACH.mul(liquid.radius);
  const fromCentre = page.sub(liquid.origin).sub(liquid.centre);
  const away = d
    .vec2f(std.max(std.abs(fromCentre.x) - liquid.span, 0), fromCentre.y)
    .div(reach);
  const rise = liquid.rise;
  return std.saturate(
    rise + (liquid.riseGoal - rise) * RISE_LEAD * std.exp(-std.dot(away, away)),
  );
};

const premultiplied = (color: d.v4f) => {
  "use gpu";
  return d.vec4f(color.xyz.mul(color.w), color.w);
};

const over = (top: d.v4f, under: d.v4f) => {
  "use gpu";
  return top.add(under.mul(1 - top.w));
};

/**
 * The track as the control draws it: the fill, with the ring inside its
 * edge. The ring changes from off to on as the fill does.
 */
const coverAt = (liquid: Liquid, track: Track, page: d.v2f) => {
  "use gpu";
  const risen = risenAt(liquid, page);
  const fill = std.mix(liquid.off, liquid.on, risen);
  const width = liquid.ringWidth;
  if (width <= 0) {
    return fill;
  }
  const ring = std.mix(
    premultiplied(liquid.ringOff),
    premultiplied(liquid.ringOn),
    risen,
  );
  const inRing = std.saturate(
    0.5 +
      (effectElementDistance(track, page) + width) *
        targetLayout.$.effectTarget.pixelScale.x,
  );
  return fill.mul(1 - ring.w * inRing).add(ring.xyz.mul(inRing));
};

/** The colour of the track at a page point, as the liquid sees it. */
const trackAt = (liquid: Liquid, track: Track, page: d.v2f) => {
  "use gpu";
  const edge = effectElementDistance(track, page);
  const fill = coverAt(liquid, track, page);
  const shaded = std.mix(fill, liquid.backdrop, EDGE_SHADE);
  const rim = std.smoothstep(-1.5, 0, edge);
  return std.mix(
    std.mix(fill, shaded, rim),
    liquid.backdrop,
    std.smoothstep(0, 1, edge),
  );
};

/**
 * The particles' field at a page point, with its gradient. The particles
 * are in track space: rest radii from the origin.
 */
const fieldAt = (liquid: Liquid, page: d.v2f) => {
  "use gpu";
  const reach = FIELD_REACH * liquid.radius * liquid.scale;
  const reachSquared = reach * reach;
  let value = d.f32(0);
  let gradient = d.vec2f(0);
  const local = page.sub(liquid.origin);
  const slot = liquidLayout.$.slots[liquid.slot];
  // No particle reaches a point beyond their extent along the track. The
  // extra pixel keeps rounding from losing a particle at its full reach.
  const extent = slot.extent.mul(liquid.radius);
  if (local.x < extent.x - reach - 1 || local.x > extent.y + reach + 1) {
    return d.vec3f(0);
  }
  for (let i = d.u32(0); i < liquid.particleCount; i += 1) {
    const offset = local.sub(slot.particles[i].position.mul(liquid.radius));
    const distanceSquared = std.dot(offset, offset);
    if (distanceSquared < reachSquared) {
      const q = 1 - distanceSquared / reachSquared;
      value += q * q;
      gradient = gradient.sub(offset.mul((4 * q) / reachSquared));
    }
  }
  return d.vec3f(value, gradient);
};

/**
 * The distance from the rest shape: a pill, or a box with the corners of
 * the control's own indicator.
 */
const restDistance = (liquid: Liquid, page: d.v2f) => {
  "use gpu";
  const centre = liquid.origin.add(d.vec2f(liquid.restX, 0));
  const local = page.sub(centre);
  if (liquid.corner.y === 0) {
    const toRest = local.sub(
      d.vec2f(std.clamp(local.x, -liquid.span, liquid.span), 0),
    );
    return std.length(toRest) - liquid.radius;
  }
  const shape = EffectElement(pageLayout.$.effectElements[liquid.element]);
  const half = d.vec2f(liquid.span + liquid.radius, liquid.radius);
  shape.rect = d.vec4f(centre.sub(half), half.mul(2));
  shape.radii = d.vec4f(std.min(liquid.corner.x, liquid.radius));
  shape.cornerExponent = liquid.corner.y;
  return effectElementDistance(shape, page);
};

/** The rest shape's outward normal, from the slope of its distance. */
const restOutward = (liquid: Liquid, page: d.v2f) => {
  "use gpu";
  const across = d.vec2f(0.5, 0);
  const down = d.vec2f(0, 0.5);
  const gradient = d.vec2f(
    restDistance(liquid, page.add(across)) -
      restDistance(liquid, page.sub(across)),
    restDistance(liquid, page.add(down)) - restDistance(liquid, page.sub(down)),
  );
  return std.normalize(gradient.add(d.vec2f(1e-5, 0)));
};

const bodySurface = (liquid: Liquid, page: d.v2f) => {
  "use gpu";
  const fromRest = restDistance(liquid, page);
  const calm = liquid.calm;
  if (calm >= 1) {
    return Surface({
      signedDistance: fromRest,
      outward: restOutward(liquid, page),
    });
  }
  const local = page.sub(liquid.origin.add(d.vec2f(liquid.restX, 0)));
  const toRest = local.sub(
    d.vec2f(std.clamp(local.x, -liquid.span, liquid.span), 0),
  );
  const restNormal = toRest.div(std.max(std.length(toRest), 1e-4));
  const field = fieldAt(liquid, page);
  const slope = std.max(std.length(field.yz), 1e-4);
  const fromField = (FIELD_THRESHOLD - field.x) / slope;
  const outward = std.select(field.yz.div(-slope), d.vec2f(0), field.x <= 0);
  // Where the field peaks its slope is near zero and the distance from it
  // runs away, so it is held to the radius, where the dome is flat anyway.
  const far = std.select(fromField, liquid.radius, field.x <= 0);
  return Surface({
    signedDistance: std.mix(
      std.clamp(far, -liquid.radius, liquid.radius),
      fromRest,
      calm,
    ),
    outward: std.normalize(
      std.mix(outward, restNormal, calm).add(d.vec2f(1e-5, 0)),
    ),
  });
};

/**
 * The liquid's surface: the body's, joined to the beads' by a smooth union,
 * with the radius of the dome over it, which runs from the body's to a
 * bead's through the neck between them. Beads that touch join each other
 * only a little, so that they do not run together into one lobe.
 */
const liquidSurface = (liquid: Liquid, page: d.v2f, spread: number) => {
  "use gpu";
  let distance = d.f32(1e4);
  let outward = d.vec2f(0);
  let radius = d.f32(0);
  let reach = d.f32(1e-4);
  for (
    let i = liquid.firstBead;
    i < liquid.firstBead + liquid.beadCount;
    i += 1
  ) {
    const bead = liquidLayout.$.beads[i];
    const toBead = page.sub(bead.centre);
    const beadDistance = std.length(toBead) - bead.radius;
    const join = std.max(BEAD_JOIN * bead.radius, 1e-4);
    const kept = std.saturate(0.5 + (0.5 * (beadDistance - distance)) / join);
    distance = std.mix(beadDistance, distance, kept) - join * kept * (1 - kept);
    outward = std.mix(
      toBead.div(std.max(std.length(toBead), 1e-4)),
      outward,
      kept,
    );
    radius = std.mix(bead.radius, radius, kept);
    reach = std.mix(std.max(NECK_REACH * bead.radius, 1e-4), reach, kept);
  }
  const body = bodySurface(liquid, page);
  const bodyDistance = body.signedDistance - spread;
  const kept = std.saturate(0.5 + (0.5 * (distance - bodyDistance)) / reach);
  return LiquidSurface({
    surface: Surface({
      signedDistance:
        std.mix(distance, bodyDistance, kept) - reach * kept * (1 - kept),
      outward: std.normalize(
        std.mix(outward, body.outward, kept).add(d.vec2f(1e-5, 0)),
      ),
    }),
    radius: std.mix(radius, liquid.radius + spread, kept),
  });
};

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
 */
const solidAt = (inward: number, firm: number) => {
  "use gpu";
  const threshold = (1 - firm) * (1 + MELT_WIDTH) - MELT_WIDTH;
  return std.smoothstep(threshold, threshold + MELT_WIDTH, inward);
};

/**
 * The solid surface as the control draws it at rest: its colour, with its
 * inset ring and its top light in dark. `above` is the distance from the
 * surface 1 px up.
 */
const solidBody = (liquid: Liquid, distance: number, above: number) => {
  "use gpu";
  if (liquid.edge.w <= 0) {
    return d.vec3f(liquid.thumb);
  }
  const ring = liquid.edge.w * std.saturate(1 + distance);
  const top = 0.6 * liquid.edge.w * std.saturate(above + 0.5);
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

/** The control's own ring and shadows round the solid surface, outside it. */
const restShadow = (
  liquid: Liquid,
  page: d.v2f,
  distance: number,
  spread: number,
) => {
  "use gpu";
  const ring =
    liquid.edge.x * std.saturate(1 - distance / 0.5) * std.step(0, distance);
  let near = d.f32(0);
  let far = d.f32(0);
  if (liquid.edge.y > 0) {
    const up = pageUp(liquid);
    near =
      liquid.edge.y *
      (1 -
        std.smoothstep(
          -1,
          2,
          liquidSurface(liquid, page.sub(up), spread).surface.signedDistance,
        ));
    far =
      liquid.edge.z *
      (1 -
        std.smoothstep(
          -3,
          7,
          liquidSurface(liquid, page.sub(up.mul(2.5)), spread).surface
            .signedDistance,
        ));
  }
  return 1 - (1 - ring) * (1 - near) * (1 - far);
};

/** A direction turned by an angle, in radians. */
const turned = (direction: d.v2f, angle: number) => {
  "use gpu";
  const c = std.cos(angle);
  const s = std.sin(angle);
  return d.vec2f(
    c * direction.x - s * direction.y,
    s * direction.x + c * direction.y,
  );
};

/**
 * A glass bevel in the fixed light: a quiet hairline on the sides that face
 * the light, which spills a little onto the track, a small glint where the
 * rim turns to face it, a faint glint where the rim faces straight away, and
 * a faint inner shade on the far side. The last move lifts both glints, and
 * slides them along the rim against the way the liquid moved, but only round
 * their own end of the body: a pill's long sides are straight, and a glint
 * that turned to one would light all along it. On a light surface a white
 * hairline would hide the ring round it, so there the light is only a soft
 * sheen on the track, outside the ring.
 */
const litEdge = (
  acc: d.v4f,
  distance: number,
  outward: d.v2f,
  liquid: Liquid,
  extras: number,
) => {
  "use gpu";
  const toLight = frameDir(liquid, d.vec3f(TO_LIGHT_FLAT, 0)).xy;
  const facing = std.dot(outward, toLight);
  const slide = GLINT_SLIDE * liquid.glint;
  const near = std.dot(outward, turned(toLight, -std.max(slide, 0)));
  const far = -std.dot(outward, turned(toLight, std.min(slide, 0)));
  const lift = 1 + GLINT_LIFT * std.abs(liquid.glint);
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
  const glint =
    (GLINT * std.pow(std.saturate(near), GLINT_SHINE) +
      COUNTER_GLINT * std.pow(std.saturate(far), GLINT_SHINE)) *
    lift;
  const shade = std.pow(std.saturate(-facing), 1.5) * inner;
  const lightBody = (liquid.flags & FLAG_LIGHT_BODY) !== 0;
  const dark = std.select(0.32, 0.16, lightBody) * shade * extras;
  let shine = hairline * edgeBand + glint * (edgeBand + bloom);
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

/**
 * The liquid over `under`, as much of it as `shown`, with as much of its
 * lit edge as `edgeLit`.
 */
const drawBody = (
  liquid: Liquid,
  track: Track,
  page: d.v2f,
  under: d.v4f,
  shown: number,
  edgeLit: number,
) => {
  "use gpu";
  const pixel = targetLayout.$.effectTarget.pixelScale.x;
  const seeThrough = (liquid.flags & FLAG_SEE_THROUGH) !== 0;
  const firm = liquid.firm;
  const melted = 1 - firm;
  let acc = d.vec4f(under);

  const spread = liquid.spread * melted;
  const found = liquidSurface(liquid, page, spread);
  const surface = found.surface;
  const distance = surface.signedDistance;

  if (shown > 0 && distance < 16) {
    const coverage = std.saturate(0.5 - distance * pixel);
    // A contact shadow under the water, deeper on the side away from the
    // light, and the control's own shadows under the solid surface.
    const lee =
      0.5 - 0.5 * std.dot(surface.outward, frameDir(liquid, TO_LIGHT).xy);
    const contact =
      (1 - std.smoothstep(0, SHADOW_REACH, distance)) * lee * SHADOW * melted;
    let rest = d.f32(0);
    if (firm > 0) {
      rest = restShadow(liquid, page, distance, spread) * firm;
    }
    const shadow = (1 - (1 - contact) * (1 - rest)) * (1 - coverage) * shown;
    acc = over(d.vec4f(0, 0, 0, shadow), acc);

    if (coverage > 0) {
      // The solid part is the rest shape, so that the field's bumps do not
      // show in it: about the rest place while the body is calm, and about
      // the centre of the body's mass once it moves, so the melt moves with
      // it.
      const solidCentre = std.mix(
        liquid.centre,
        d.vec2f(liquid.restX, 0),
        liquid.calm,
      );
      const toCentre = page.sub(liquid.origin.add(solidCentre));
      const toCore = d.vec2f(
        std.max(std.abs(toCentre.x) - liquid.span, 0),
        toCentre.y,
      );
      const inward = std.saturate(
        1 - std.length(toCore) / (liquid.radius + spread),
      );
      const solid = solidAt(inward, firm);
      let above = d.f32(0);
      if (solid > 0 && liquid.edge.w > 0) {
        above = liquidSurface(liquid, page.sub(pageUp(liquid)), spread).surface
          .signedDistance;
      }
      const body = lens(
        liquid,
        track,
        page,
        surface,
        found.radius,
        solid,
        solidBody(liquid, distance, above),
      );
      let layer = d.vec4f(body, 1);
      if (seeThrough) {
        // The liquid shows over the track as it is, and lets as much of the
        // page through as it can: the least alpha that gives the body over
        // the track's fill. Where it is lighter than the track, that alpha
        // keeps a white label under it white. A set body much lighter than
        // a light track needs an alpha near one, which hides a dark label
        // under it, so where the body is set the alpha stops at
        // SEE_THROUGH_COVER, and the body shows a little nearer the track's
        // fill. The colour stays at or below the alpha: Chrome drops the
        // light of a premultiplied colour above its alpha when it converts
        // the canvas for a wide-gamut display.
        const behind = trackAt(liquid, track, page);
        const darker = d.vec3f(1).sub(body.div(std.max(behind, d.vec3f(1e-3))));
        const lighter = body
          .sub(behind)
          .div(std.max(d.vec3f(1).sub(behind), d.vec3f(1e-3)));
        const needed = std.max(darker, lighter);
        const cover = std.mix(1, SEE_THROUGH_COVER, solid);
        const alpha = std.min(
          std.saturate(std.max(needed.x, std.max(needed.y, needed.z))),
          cover,
        );
        layer = d.vec4f(
          std.clamp(
            body.sub(behind.mul(1 - alpha)),
            d.vec3f(0),
            d.vec3f(alpha),
          ),
          alpha,
        );
      }
      acc = over(layer.mul(coverage * shown), acc);
    }
  }

  if (edgeLit > 0 && distance < 4) {
    acc = litEdge(acc, distance, surface.outward, liquid, edgeLit);
  }
  return acc;
};

/**
 * Each control's liquid over its track. On a Switch it paints the track
 * while the liquid moves: the on fill rises through the off fill, ahead
 * under the liquid. Then it paints the liquid as water: the field of the
 * particles gives the body its surface, which a smooth union joins to each
 * bead's, so a bead swells out of the body and pinches off on a neck, and
 * joins it again the same way. A dome over that surface bends what the
 * track shows through it, and the dome's slope lights it with a thin rim, a
 * highlight and a caustic. As far as the body has set it is the control's
 * own solid surface, with its edge and its shadows, so that it settles into
 * the look the control has at rest. At rest the control draws its own
 * surface, and the shader adds only a lit edge to it. Under reduced motion
 * it fades the solid surface out of its old place as it fades it into the
 * new one.
 */
const liquidFragment = tgpu.fragmentFn({
  in: instancedQuadVarying,
  out: d.vec4f,
})((input) => {
  "use gpu";
  const liquid = liquidLayout.$.liquids[input.instance];
  const track = trackInFrame(
    liquid,
    pageLayout.$.effectElements[liquid.element],
  );
  const onPage = fragmentToPage(input.position.xy);
  const page = toTrackFrame(liquid, onPage);
  const pixel = targetLayout.$.effectTarget.pixelScale.x;
  const seeThrough = (liquid.flags & FLAG_SEE_THROUGH) !== 0;
  // A liquid in front of the page stays inside the track's padding box.
  const inset = std.select(
    d.f32(0),
    track.rect.w * 0.5 - liquid.radius - liquid.spread,
    seeThrough,
  );
  const onTrack = std.saturate(
    0.5 - (effectElementDistance(track, page) + std.max(inset, 0)) * pixel,
  );
  if (onTrack <= 0) {
    return d.vec4f(0);
  }
  const clip = onTrack * effectClip(track.scope, onPage);

  let acc = d.vec4f(0);
  if ((liquid.flags & FLAG_COVER) !== 0) {
    acc = d.vec4f(coverAt(liquid, track, page), 1).mul(liquid.body);
  }
  const fading = liquid.leaving.z;
  if (fading > 0) {
    const leaving = LiquidInstance(liquid);
    leaving.restX = liquid.leaving.x;
    leaving.centre = d.vec2f(liquid.leaving.x, 0);
    leaving.span = liquid.leaving.y;
    leaving.calm = 1;
    leaving.beadCount = 0;
    acc = drawBody(leaving, track, page, acc, fading, liquid.edgeLit * fading);
  }
  acc = drawBody(liquid, track, page, acc, liquid.body, liquid.edgeLit);
  return d.vec4f(effectGrayscale(acc.xyz, track.grayscale), acc.w).mul(clip);
});

/**
 * The render shader of the Liquid effect, for `createInstancedDraw`: one
 * quad over the track for each entry of `liquids`.
 *
 * @internal
 */
export const liquidShader = {
  vertex: liquidVertex,
  fragment: liquidFragment,
};
