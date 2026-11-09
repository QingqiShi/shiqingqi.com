import { clamp } from "../clamp.ts";
import {
  EFFECT_SETTING_DEFAULTS,
  finiteOr,
} from "./effect-setting-defaults.ts";
import { handBack } from "./hand-back.stylex.ts";
import type {
  LiquidInstanceRecord,
  TrackRing,
} from "./liquid-instance-value.ts";
import type {
  LiquidBead as LiquidBeadSchema,
  LiquidStep as LiquidStepSchema,
} from "./liquid-layout.ts";
import type { LiquidControl, Pill } from "./liquid-reader.ts";
import { beadRadius, NECK_REACH } from "./move-beads.ts";
import { paletteOf } from "./palette-of.ts";
import type { EffectColor } from "./parse-css-color.ts";
import { headingTo, leanTowards, pillAt, segmentOf } from "./pill-at.ts";
import {
  FIELD_REACH,
  restingLiquid,
  type LiquidBody,
} from "./resting-liquid.ts";
import {
  NO_EDGE_LIGHT,
  stepEdgeLight,
  type EdgeLight,
} from "./step-edge-light.ts";
import {
  finiteParticles,
  frozenLiquid,
  LINGER_SET,
  liquidStep,
  mean,
  settleOnSnapshot,
  type LiquidSnapshot,
} from "./step-liquid.ts";
import { stepRise, type Rise } from "./step-rise.ts";
import type { EffectElementRecord, EffectFrame, EffectInput } from "./types.ts";

/**
 * A frame with no measured time, the first after the loop was idle, steps
 * this far.
 */
const FIRST_STEP = 1 / 60;

const NO_RING: TrackRing = { off: [0, 0, 0, 0], on: [0, 0, 0, 0], width: 0 };

const rgb = (color: EffectColor) => [color[0], color[1], color[2]] as const;

const dim = (color: readonly [number, number, number], light: number) =>
  [color[0] * light, color[1] * light, color[2] * light] as const;

/**
 * How bright the on fill is under the clear liquid, as a share of its
 * brightness under the solid thumb, so that the clear liquid shows over it.
 */
const THAWED_LIGHT = 0.55;

/**
 * The liquid of one control between frames.
 *
 * @internal
 */
export interface LiquidState {
  readonly body: LiquidBody;
  /** How far the on fill has risen through the track, from 0 off to 1 on. */
  readonly rise: Rise;
  /** The stop index the liquid rests at, at the last frame. */
  readonly position: number;
  /** The stop index a drag held the liquid at, at the last frame, or `null`. */
  readonly drag: number | null;
  /** The pill of the last step, in rest radii. */
  readonly target: number;
  readonly span: number;
  /** A pointer was down on the control at the last step. */
  readonly pressed: boolean;
  /** Which way the liquid last poured: 1 along the track, -1 back. */
  readonly heading: -1 | 1;
  /** The effect draws the liquid, in place of the control's own surface. */
  readonly active: boolean;
  /** When the effect started to hand the surface back, or `null`. */
  readonly handFrom: number | null;
  /** The light on the lit edge, as `stepEdgeLight` gives it. */
  readonly light: EdgeLight;
  /** Seconds on the liquid's clock that the GPU has been given to simulate. */
  readonly simulated: number;
  /** The time on that clock that the body's particles are from. */
  readonly particlesAt: number;
  /**
   * Under reduced motion, the pill the surface fades out of, in rest radii,
   * and when the fade started, or `null`.
   */
  readonly fade: {
    readonly target: number;
    readonly span: number;
    readonly start: number;
  } | null;
}

/**
 * Seconds the effect takes to hand the selected surface back to the
 * control, and, under reduced motion, to fade it from one place to the
 * next.
 *
 * @internal
 */
export const HAND_SECONDS = Number.parseFloat(handBack.duration) / 1000;
/** The fill that rises through a track is as good as risen this near its goal. */
const RISE_SEEN = 0.03;

/**
 * How much of the liquid the effect draws while it hands the surface back.
 * The control fades its own surface in under the effect. An indicator that
 * the labels show through fades out at the same pace, so the two add up to
 * one. An opaque thumb stays whole until the control's is whole, because
 * two half-opaque thumbs over each other let the track through.
 */
function handAlpha(
  control: LiquidControl,
  active: boolean,
  handFrom: number | null,
  time: number,
) {
  if (!active) {
    return 0;
  }
  if (handFrom === null || control.thumb) {
    return 1;
  }
  return clamp(1 - (time - handFrom) / HAND_SECONDS, 0, 1);
}

/**
 * How calm the drawn surface is before its rest shape can show where no
 * particle is, as `LiquidInstanceRecord.calm` gives it. The surface is the
 * field's until then, and the field is held to one radius outside the body.
 */
const HALF_CALM = 0.25;

/**
 * How far along the track `body` draws, in rest radii from the origin: its
 * particles with the reach of their field, the rest shapes in `pills` that
 * show, and its beads with the necks to them, each with `spread` round it.
 */
function extentOf(
  body: LiquidBody,
  pills: readonly Pill[],
  spread: number,
): readonly [number, number] {
  let from = Number.POSITIVE_INFINITY;
  let to = Number.NEGATIVE_INFINITY;
  const reach = FIELD_REACH * body.scale + spread;
  for (const x of body.x) {
    from = Math.min(from, x - reach);
    to = Math.max(to, x + reach);
  }
  for (const pill of pills) {
    const [start, end] = segmentOf(pill);
    from = Math.min(from, start - spread);
    to = Math.max(to, end + spread);
  }
  for (const bead of body.beads) {
    const around = beadRadius(bead) * (1 + NECK_REACH) + spread;
    from = Math.min(from, bead.x - around);
    to = Math.max(to, bead.x + around);
  }
  return [from, to];
}

/**
 * Steps one control's liquid and lays it out on the page. It rests in the
 * pill of the stop at `position`, or where a drag holds it, and there the
 * control draws its own solid surface. While a pointer is over the control
 * or presses it, `pointerAt` says where, and the effect draws a lit edge over
 * that surface, as `stepEdgeLight` moves it. A new position pours the liquid
 * there: it melts into water, pours over, lands on the wall ahead, the far
 * end of that stop's pill, and sloshes against it. It flows on for about
 * 0.8 s after it arrives, and sets into the control's solid surface as it
 * settles.
 * Once it is solid and still, the effect hands the surface back to the
 * control. Under reduced motion it pours nothing: the solid surface fades
 * out of the old pill as it fades into the new one, in `HAND_SECONDS`.
 *
 * The GPU moves the particles, in the slot `slot` of the simulation
 * buffer: each frame the liquid moves, this returns the step for the GPU
 * to run, and reads the particles the GPU last sent back, `moved`, to
 * settle the body. Those are a frame or so old, which the settling
 * tolerates. The body's own particles go to the GPU when `seed` is
 * returned: for a new body, under reduced motion, once the body has
 * settled, and when the particles that came back are not finite, which
 * puts the body at rest on its target.
 *
 * @internal
 */
export function layoutLiquid(
  control: LiquidControl,
  record: Pick<
    EffectElementRecord,
    "id" | "settings" | "x" | "y" | "width" | "height"
  >,
  elementIndex: number,
  slot: number,
  state: LiquidState | undefined,
  frame: Pick<EffectFrame, "time" | "delta" | "reducedMotion">,
  pointerAt: number | null,
  backdrop: EffectColor,
  moved: LiquidSnapshot | null,
  beads: EffectInput<typeof LiquidBeadSchema>[],
): {
  state: LiquidState;
  instance: LiquidInstanceRecord;
  /** The effect draws the surface, so the control hides its own. */
  drawn: boolean;
  /**
   * How far along the track the liquid draws, from its least x to its
   * greatest, in rest radii from the origin.
   */
  extent: readonly [number, number];
  /** Something moves, so the next frame must follow. */
  animating: boolean;
  /** The step for the GPU to run on the body's slot this frame, or `null`. */
  step: EffectInput<typeof LiquidStepSchema> | null;
  /** Put the body's particles into its slot before the step. */
  seed: boolean;
  /** A fade under reduced motion needs the next frame, though reduced motion asks for none. */
  fading: boolean;
} {
  const settings = record.settings.liquid ?? EFFECT_SETTING_DEFAULTS.liquid;
  const { radius, travel, stops, fill } = control;
  const originX = record.x + control.originX;
  const originY = record.y + control.originY;
  const last = stops.length - 1;
  const position = clamp(finiteOr(settings.position, 0), 0, last);
  const drag =
    settings.drag === null ? null : clamp(finiteOr(settings.drag, 0), 0, last);
  const pressed = settings.pressed;
  const held = drag !== null;
  const reduced = frame.reducedMotion;
  const { target, span } = pillAt(stops, drag ?? position);

  let body = state?.body ?? restingLiquid(target, { seed: record.id, span });
  let heading = state?.heading ?? headingTo(position, position, last);
  if (state !== undefined && position !== state.position) {
    heading = headingTo(position, state.drag ?? state.position, last);
  }
  const pillMoved =
    state !== undefined && (target !== state.target || span !== state.span);
  // A layout change, such as a resize, moves the pill of a liquid at rest
  // while nothing selects or presses it. The liquid then rests in the new
  // pill at once, and the control keeps its own surface.
  const relaid =
    pillMoved &&
    !state.active &&
    position === state.position &&
    drag === state.drag &&
    pressed === state.pressed;
  if (pillMoved && !relaid && !(held && state.drag !== null)) {
    // The drawn surface settles into the rest pill as the body calms. A new
    // target moves that pill at once, so the body is not calm until it has
    // arrived there. A drag that goes on moves the target in each frame,
    // also while a held finger only trembles, and there the body stays
    // liquid, as `settleLiquid` keeps it.
    body = { ...body, calm: 0 };
  }
  const ahead =
    heading > 0
      ? pillAt(stops, Math.ceil(position))
      : pillAt(stops, Math.floor(position));
  const input = {
    target,
    span,
    from: held || heading > 0 ? 0 : ahead.target - ahead.span,
    to: held || heading < 0 ? travel : ahead.target + ahead.span,
    pressed,
    reducedMotion: reduced,
    aim: 0,
    held: held && state?.drag != null,
  };
  if (relaid) {
    body = frozenLiquid(body, input);
  }
  // A new body rests as laid out: a step would move the particles towards
  // their own spacing and melt the surface for no reason.
  const resting =
    body.settled &&
    (state === undefined ||
      relaid ||
      (target === state.target &&
        span === state.span &&
        pressed === state.pressed));
  const delta = frame.delta > 0 ? frame.delta : FIRST_STEP;
  let simulated = state?.simulated ?? 0;
  let particlesAt = state?.particlesAt ?? 0;
  let seed = state === undefined || relaid;
  let step: EffectInput<typeof LiquidStepSchema> | null = null;
  if (!resting && reduced) {
    body = frozenLiquid(body, input);
    seed = true;
  } else if (!resting) {
    ({ body, particlesAt } = settleOnSnapshot(
      body,
      moved,
      particlesAt,
      input,
      delta,
    ));
    if (!finiteParticles(body)) {
      // The GPU's particles are lost, so the body rests at its target and
      // goes back to the GPU whole.
      body = frozenLiquid(body, input);
    }
    if (body.settled) {
      seed = true;
    } else {
      step = {
        goal: target,
        span,
        aim: 0,
        scale: body.scale,
        walls: [input.from, input.to],
        seconds: liquidStep(delta),
        count: body.x.length,
        slot,
      };
    }
  }
  if (seed) {
    particlesAt = simulated;
  }
  if (step !== null) {
    simulated += step.seconds;
  }

  // The track is all one fill, which goes from off to on as the on fill
  // rises through it: with the liquid while a drag holds it, and on its
  // own after a toggle.
  const level = fill !== null && position === last ? 1 : 0;
  const riseGoal =
    fill === null
      ? 0
      : held && travel > 0
        ? clamp(mean(body.x) / travel, 0, 1)
        : level;
  const rise =
    state === undefined
      ? { level, speed: 0 }
      : stepRise(state.rise, riseGoal, delta, reduced);

  let fade = reduced ? (state?.fade ?? null) : null;
  if (reduced && pillMoved && !relaid && !held) {
    fade = { target: state.target, span: state.span, start: frame.time };
  }
  if (fade !== null && frame.time - fade.start >= HAND_SECONDS) {
    fade = null;
  }
  const fadeIn =
    fade === null ? 1 : clamp((frame.time - fade.start) / HAND_SECONDS, 0, 1);

  // The effect draws the liquid from the first frame it is not the solid
  // surface at rest, and hands the surface back once it is again. Under
  // reduced motion no frame follows to hand it back, so it hands it back at
  // once.
  const atRest =
    body.settled &&
    body.set >= 1 &&
    Math.abs(rise.level - riseGoal) < RISE_SEEN;
  let active = state?.active ?? false;
  let handFrom = state?.handFrom ?? null;
  if (reduced) {
    active = fade !== null || !atRest;
    handFrom = null;
  } else if (!atRest) {
    active = true;
    handFrom = null;
  } else if (active && handFrom === null) {
    handFrom = frame.time;
  } else if (active && frame.time - (handFrom ?? 0) >= HAND_SECONDS) {
    active = false;
    handFrom = null;
  }

  const vertical = control.vertical === true;
  const centreX = mean(body.x);
  const { light, settled: lightSettled } = stepEdgeLight(
    state?.light ?? NO_EDGE_LIGHT,
    pointerAt === null ? null : leanTowards(pointerAt, control, target, span),
    delta,
    reduced,
  );
  // The lit edge is the solid surface's, so it shows only as the liquid sets
  // past the core it keeps while it lingers.
  const edgeLit =
    clamp((body.set - LINGER_SET) / (1 - LINGER_SET), 0, 1) *
    fadeIn *
    light.amount;

  const firstBead = beads.length;
  for (const bead of body.beads) {
    beads.push({
      centre: [originX + bead.x * radius, originY + bead.y * radius],
      radius: beadRadius(bead) * radius,
    });
  }
  // A track with no fill of its own shows the page.
  const under = control.under[3] > 0 ? control.under : backdrop;
  const { solid, lightBody } = paletteOf(control, under);
  const calm = body.calm * body.calm;
  return {
    state: {
      body,
      rise,
      position,
      drag,
      target,
      span,
      pressed,
      heading,
      active,
      handFrom,
      light,
      simulated,
      particlesAt,
      fade,
    },
    step,
    seed,
    fading: fade !== null,
    drawn: active && handFrom === null,
    extent: extentOf(
      body,
      [
        ...(calm >= HALF_CALM ? [{ target, span }] : []),
        ...(fade === null ? [] : [fade]),
      ],
      control.spread / radius,
    ),
    animating:
      !body.settled ||
      rise.level !== riseGoal ||
      !lightSettled ||
      handFrom !== null,
    instance: {
      elementIndex,
      slot,
      particleCount: body.x.length,
      firstBead,
      beadCount: body.beads.length,
      radius,
      // The drawn surface keeps the liquid's own shape for most of the
      // time the body takes to calm, and rounds into the rest shape at
      // the end.
      calm,
      originX,
      originY,
      restX: target * radius,
      span: span * radius,
      scale: body.scale,
      spread: control.spread,
      centreX: centreX * radius,
      centreY: mean(body.y) * radius,
      thumb: solid,
      firm: body.set,
      lightBody,
      off: rgb(fill?.off ?? under),
      // The on fill is dim under the clear liquid, and brightens as it
      // sets.
      on: dim(
        rgb(fill?.on ?? under),
        THAWED_LIGHT + (1 - THAWED_LIGHT) * body.set,
      ),
      ring: control.ring ?? NO_RING,
      rise: rise.level,
      riseGoal,
      cover: fill !== null && active,
      seeThrough: !control.thumb,
      corner: control.corner,
      backdrop: rgb(backdrop),
      body: handAlpha(control, active, handFrom, frame.time) * fadeIn,
      lean: light.lean,
      vertical,
      edge: control.edge,
      edgeLit,
      leaving:
        fade === null
          ? [0, 0, 0]
          : [fade.target * radius, fade.span * radius, 1 - fadeIn],
    },
  };
}
