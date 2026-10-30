import { d, std, tgpu } from "typegpu";
import {
  BEAM_CUTOFF,
  BEAM_DIVERGENCE,
  BEAM_DUST_REACH,
  BEAM_WIDTH,
} from "./beam-meets-rect.ts";
import { Beam, blackHoleLayout, Lens } from "./black-hole-layout.ts";
import { effectClip } from "./effect-clip.ts";
import {
  effectElementDistance,
  effectGrayscale,
} from "./effect-element-distance.ts";
import { fragmentToPage } from "./element-quad.ts";
import { POINT_MASS_DISTANCE } from "./lens-from-box.ts";
import { pageLayout } from "./page-layout.ts";
import { hash3 } from "./pcg.ts";

const CORE_WIDTH = 1.1;
const DUST_CELL = 7;
const DUST_DENSITY = 0.28;
/** Below this, a mote catches no light. */
const MIN_MOTE = 1 / 255;
const DITHER_STEP = 1 / 255;

/** One corner's share of `boxBend` in `lens-from-box.ts`. */
const cornerBend = tgpu.fn(
  [d.vec2f],
  d.vec2f,
)((corner) => {
  "use gpu";
  const halfLog = 0.5 * std.log(std.max(std.dot(corner, corner), 1e-6));
  const safe = std.select(
    corner,
    d.vec2f(1e-6),
    std.lt(std.abs(corner), d.vec2f(1e-6)),
  );
  return d.vec2f(
    corner.x * std.atan(corner.y / safe.x) + corner.y * halfLog,
    corner.y * std.atan(corner.x / safe.y) + corner.x * halfLog,
  );
});

/** `massHalfSize` in `lens-from-box.ts`. */
const massHalfSize = tgpu.fn(
  [Lens],
  d.vec2f,
)((lens) => {
  "use gpu";
  return std.max(lens.halfSize.sub(lens.cornerRadius), d.vec2f(0.5));
});

/** `lensBend` in `lens-from-box.ts`. */
const lensBend = tgpu.fn(
  [Lens, d.vec2f],
  d.vec2f,
)((lens, page) => {
  "use gpu";
  const offset = page.sub(lens.center);
  const squared = std.dot(offset, offset);
  const fade = 1 / (1 + squared / lens.falloff);
  const held = massHalfSize(lens);
  const far = POINT_MASS_DISTANCE * std.max(held.x, held.y);
  if (squared > far * far) {
    return offset.mul((lens.mass * fade) / squared);
  }
  const low = offset.add(held);
  const high = offset.sub(held);
  const bend = cornerBend(low)
    .sub(cornerBend(d.vec2f(low.x, high.y)))
    .sub(cornerBend(d.vec2f(high.x, low.y)))
    .add(cornerBend(high));
  return bend.mul((lens.mass * fade) / (4 * held.x * held.y));
});

/**
 * How brightly a beam lights a point: x is the core and the soft edge, y is
 * the light that dust there would catch.
 */
const beamLight = tgpu.fn(
  [Beam, d.vec2f],
  d.vec2f,
)((beam, source) => {
  "use gpu";
  const offset = source.sub(beam.origin);
  const along = std.dot(offset, beam.direction);
  if (along <= 0 || along >= beam.reach) {
    return d.vec2f(0);
  }
  const across = std.dot(offset, d.vec2f(-beam.direction.y, beam.direction.x));
  const spread = BEAM_WIDTH + along * BEAM_DIVERGENCE;
  if (std.abs(across) > spread * BEAM_DUST_REACH * BEAM_CUTOFF) {
    return d.vec2f(0);
  }
  const fade =
    std.smoothstep(0, std.max(beam.start, 1), along) *
    (1 - std.smoothstep(beam.reach * 0.3, beam.reach, along));
  const core = std.exp(-(across * across) / (CORE_WIDTH * CORE_WIDTH));
  const soft =
    (std.exp(-(across * across) / (spread * spread)) * BEAM_WIDTH) / spread;
  const dustSpread = spread * BEAM_DUST_REACH;
  const dust =
    std.exp(-(across * across) / (dustSpread * dustSpread)) *
    std.sqrt(BEAM_WIDTH / spread);
  const softGain = std.select(
    d.f32(0.13),
    d.f32(0.2),
    blackHoleLayout.$.scene.dark > 0.5,
  );
  return d.vec2f(core * 0.85 + soft * softGain, dust).mul(fade);
});

/**
 * Whether a beam can light a point that is `bend` or less from a page
 * point. The test is cheap, so most pixels do not do the lens calculation.
 */
const beamNear = tgpu.fn(
  [Beam, d.vec2f, d.f32],
  d.bool,
)((beam, page, bend) => {
  "use gpu";
  const offset = page.sub(beam.origin);
  const along = std.dot(offset, beam.direction);
  const across = std.dot(offset, d.vec2f(-beam.direction.y, beam.direction.x));
  const spread = BEAM_WIDTH + std.max(along + bend, 0) * BEAM_DIVERGENCE;
  return (
    along > -bend &&
    along < beam.reach + bend &&
    std.abs(across) < spread * BEAM_DUST_REACH * BEAM_CUTOFF + bend
  );
});

/** One triangle that covers the target. */
const blackHoleVertex = tgpu.vertexFn({
  in: { vertex: d.builtin.vertexIndex },
  out: { position: d.builtin.position },
})((input) => {
  "use gpu";
  const corner = d.vec2f(
    d.f32((input.vertex << 1) & 2),
    d.f32(input.vertex & 2),
  );
  return { position: d.vec4f(corner.mul(2).sub(1), 0, 1) };
});

/**
 * Each Light beam as the page would see it behind every Black hole. Each
 * pixel finds where its light comes from, `sourceOf` in `lens-from-box.ts`,
 * and lights it from the beams there.
 */
const blackHoleFragment = tgpu.fragmentFn({
  in: { position: d.builtin.position },
  out: d.vec4f,
})((input) => {
  "use gpu";
  const scene = blackHoleLayout.$.scene;
  const page = fragmentToPage(input.position.xy);
  const clip = effectClip(scene.scope, page);
  if (clip <= 0) {
    return d.vec4f(0);
  }
  // A mass bends light by at most its mass over its distance.
  let bend = d.f32(0);
  for (let index = d.u32(0); index < scene.lensCount; index += 1) {
    const lens = scene.lenses[index];
    if (
      effectElementDistance(pageLayout.$.effectElements[lens.element], page) < 0
    ) {
      return d.vec4f(0);
    }
    const outside = std.max(
      std.abs(page.sub(lens.center)).sub(massHalfSize(lens)),
      d.vec2f(0),
    );
    const clamped = std.max(std.length(outside), 1);
    bend += lens.mass / (clamped * (1 + (clamped * clamped) / lens.falloff));
  }
  let near = false;
  for (let index = d.u32(0); index < scene.beamCount; index += 1) {
    near = near || beamNear(scene.beams[index], page, bend);
  }
  if (!near) {
    return d.vec4f(0);
  }

  let source = d.vec2f(page);
  for (let index = d.u32(0); index < scene.lensCount; index += 1) {
    source = source.sub(lensBend(scene.lenses[index], page));
  }

  const cell = std.floor(source.div(DUST_CELL));
  const random = hash3(d.vec2i(cell));
  let mote = d.f32(0);
  let moteCenter = d.vec2f(source);
  if (random.z < DUST_DENSITY) {
    moteCenter = cell.add(random.xy.mul(0.6).add(0.2)).mul(DUST_CELL);
    const size = std.mix(0.45, 0.95, random.z / DUST_DENSITY);
    const distance = std.length(source.sub(moteCenter));
    mote =
      std.exp(-(distance * distance) / (size * size)) *
      std.mix(0.35, 1, std.fract(random.z * 37));
  }

  const dark = scene.dark > 0.5;
  let light = d.vec3f(0);
  let alpha = d.f32(0);
  for (let index = d.u32(0); index < scene.beamCount; index += 1) {
    const beam = scene.beams[index];
    const beamAt = beamLight(beam, source);
    let intensity = d.f32(beamAt.x);
    if (mote > MIN_MOTE) {
      intensity +=
        mote *
        beamLight(beam, moteCenter).y *
        std.select(d.f32(0.4), d.f32(0.75), dark);
    }
    const emitter = pageLayout.$.effectElements[beam.element];
    // No light shows on the beam's own element.
    intensity *= std.saturate(effectElementDistance(emitter, page) + 0.5);
    const hot = std.select(
      d.f32(0),
      std.smoothstep(0.35, 0.9, beamAt.x) * 0.55,
      dark,
    );
    light = light.add(
      effectGrayscale(
        std.mix(beam.color, d.vec3f(1), hot),
        emitter.grayscale,
      ).mul(intensity),
    );
    alpha += intensity;
  }
  alpha *= clip;
  if (alpha <= 0) {
    return d.vec4f(0);
  }

  // Dither by up to half a step of 8 bits, so the soft edge shows no bands.
  const noise = hash3(d.vec2i(input.position.xy)).x - 0.5;
  const covered = std.clamp(std.min(alpha, 1) + noise * DITHER_STEP, 0, 1);
  return d.vec4f(std.min(light.div(alpha), d.vec3f(1)).mul(covered), covered);
});

/**
 * The render shader of the Black hole effect: one triangle over the whole
 * target that draws each Light beam of `scene`, bent by each of its Black
 * holes, from the edge of its element and never inside it, and only inside
 * its Effect container. Light that passes straight behind a Black hole
 * shows as a ring around it.
 *
 * @internal
 */
export const blackHoleShader = {
  vertex: blackHoleVertex,
  fragment: blackHoleFragment,
};
