import { d, std } from "typegpu";
import { effectElementDistance } from "./effect-element-distance.ts";
import { liquidLayout } from "./liquid-layout.ts";
import { NECK_REACH } from "./move-beads.ts";
import { EffectElement, pageLayout } from "./page-layout.ts";
import { KERNEL_REACH } from "./resting-liquid.ts";
import type { Liquid } from "./to-track-frame.ts";

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

/**
 * A surface at a point: the signed distance to it, below zero inside, in CSS px, and its outward normal.
 *
 * @internal
 */
export const Surface = d.struct({ signedDistance: d.f32, outward: d.vec2f });
/** @internal */
export type Surface = d.Infer<typeof Surface>;

/**
 * The liquid's surface, with the radius of the dome over it, which runs
 * from the body's to a bead's through the neck between them.
 */
const LiquidSurface = d.struct({ surface: Surface, radius: d.f32 });

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
 *
 * @internal
 */
export const liquidSurface = (liquid: Liquid, page: d.v2f, spread: number) => {
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
