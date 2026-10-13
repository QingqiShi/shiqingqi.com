import {
  GPU_BUFFER_USAGE,
  GPU_MAP_MODE,
  GPU_SHADER_STAGE,
  PREMULTIPLIED_BLEND,
} from "./constants.ts";
import { createBinding } from "./create-binding.ts";
import { createPackedBuffer } from "./create-packed-buffer.ts";
import {
  createRingLightRenderer,
  type RingLightDraw,
  ringLightBox,
  ringLightPaint,
} from "./create-ring-light-renderer.ts";
import { roleBits } from "./effect-roles.ts";
import {
  EFFECT_SETTING_DEFAULTS,
  finiteOr,
} from "./effect-setting-defaults.ts";
import {
  FROST_CONTRAST,
  frostOpacity,
  glowColors,
  restingGlow,
} from "./glow-colors.ts";
import { instanceRange } from "./instance-range.ts";
import { lastResultOf } from "./last-result-of.ts";
import {
  LIQUID_COMPUTE_WGSL,
  LIQUID_STEP_BYTES,
  packLiquidSteps,
  type LiquidStep,
} from "./liquid-compute-wgsl.ts";
import { LIQUID_INDICATOR, LIQUID_SEGMENT } from "./liquid-indicator.ts";
import {
  LIQUID_SLOT_BYTES,
  LIQUID_SLOT_WORDS,
  packLiquidSlot,
  readLiquidSlot,
} from "./liquid-shared-wgsl.ts";
import {
  LIQUID_INSTANCE_BYTES,
  LIQUID_WGSL,
  packLiquidBeads,
  packLiquidInstances,
  type LiquidBeadInstance,
  type LiquidInstance,
} from "./liquid-wgsl.ts";
import { markEffectDrawn } from "./mark-effect-drawn.ts";
import type { EffectColor } from "./parse-css-color.ts";
import {
  readCornerExponent,
  readFill,
  resolveCornerRadii,
} from "./read-element-box.ts";
import {
  ringLightAt,
  ringLightEnd,
  type RingLight,
  type RingLightBox,
} from "./ring-light-at.ts";
import type { RingLightInstance } from "./ring-light-wgsl.ts";
import { isLightBackdrop } from "./ripple-color.ts";
import {
  beadRadius,
  frozenLiquid,
  impactOn,
  liquidStep,
  mean,
  restingLiquid,
  settleOnSnapshot,
  type LiquidBody,
  type LiquidSnapshot,
} from "./step-liquid.ts";
import { stepRise, type Rise } from "./step-rise.ts";
import type { Effect, EffectElementRecord, EffectFrame } from "./types.ts";

const LIQUID = roleBits(["liquid"]);
const BEAD_BYTES = 16;
const MIN_SLOT_CAPACITY = 4;
/**
 * How many copies of the simulation buffer can be on their way back to
 * the CPU at once: one is read while the next is being copied, and a
 * third covers a map that takes a frame longer.
 */
const MAX_READBACKS = 3;
/** A frame with no measured time, the first, steps this far. */
const FIRST_STEP = 1 / 60;
/**
 * Seconds the plain thumb takes to freeze into ice once the effect takes
 * over from the control, so that nothing jumps.
 */
const FREEZE_IN_SECONDS = 0.4;
/** How opaque the frozen thumb is at least, at its core and at its edge. */
const FROST = { core: 0.72, edge: 0.5 } as const;
/**
 * How opaque the frozen indicator is at least, and at most as opaque as
 * its own fill. The segment labels are under the liquid, so it lets the
 * selected label show through.
 */
const SEGMENT_FROST = { core: 0.35, edge: 0.25 } as const;
/** How strong the faint glow under the indicator is, on a light page and on a dark one. */
const SEGMENT_GLOW = { light: 0.08, dark: 0.16 } as const;
/** A contrast of 1:1, which every frost has: no floor. */
const NO_FLOOR = { core: 1, edge: 1 } as const;
/**
 * How strong the glow that stays under the frozen thumb on the on fill is:
 * how far it goes from the fill towards the glow's colour, before the
 * thumb's contrast limits it. That colour is the glow's pale core on a dark
 * page. On a light page it is the glow's saturated halo, because a pale glow
 * there would take the contrast of the light thumb over it.
 */
const REST_GLOW = 0.7;
/**
 * How bright the on fill and its glow are under the clear liquid, as a
 * share of their brightness under the frozen thumb, so that the clear
 * liquid shows over them.
 */
const THAWED_LIGHT = 0.55;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const px = (value: string) => finiteOr(Number.parseFloat(value), 0);

/**
 * Where the liquid rests: a pill round `target`, with a straight part
 * `2 × span` long, in rest radii.
 *
 * @internal
 */
export interface Pill {
  readonly target: number;
  readonly span: number;
}

interface FrostLevels {
  readonly core: number;
  readonly edge: number;
}

/**
 * A control the liquid draws in, read from the page. A Switch's thumb is
 * an indicator with two stops: its off end and its on end.
 *
 * @internal
 */
export interface LiquidControl {
  /** The rest radius in CSS px. */
  readonly radius: number;
  /** The centre of a rest circle against the start of the track, in the page. */
  readonly originX: number;
  readonly originY: number;
  /** How far the liquid can go along the track, in rest radii. */
  readonly travel: number;
  /** Where the liquid rests at each position, in track space. */
  readonly stops: readonly Pill[];
  /** The ring light that runs where the liquid lands on each stop, or `null` for none. */
  readonly rings: readonly ({
    readonly box: RingLightBox;
    readonly cornerExponent: number;
    readonly color: EffectColor;
  } | null)[];
  /**
   * The frozen liquid's colour, the fill under it at rest, how opaque it is
   * at least, and the contrast against that fill that makes it more opaque.
   */
  readonly frost: {
    readonly color: EffectColor;
    readonly under: EffectColor;
    readonly least: FrostLevels;
    readonly contrast: FrostLevels;
  };
  /** The fills the track goes from and to as the liquid rises through it, or `null` for none. */
  readonly fill: { readonly off: EffectColor; readonly on: EffectColor } | null;
  /**
   * On a track with no fill, the page shows through the liquid, and a glow
   * of this colour and strength lies under it.
   */
  readonly underGlow?: {
    readonly color: EffectColor;
    readonly strength: { readonly light: number; readonly dark: number };
  };
  /** The corners of the rest shape, where they are not those of a pill. */
  readonly corner?: { readonly radius: number; readonly exponent: number };
  /** How far the liquid's surface swells past its rest shape, in CSS px. */
  readonly spread: number;
}

/**
 * The pill at `index`, a stop index that can be fractional: between two
 * stops, the target and the span go from one to the other.
 *
 * @internal
 */
export function pillAt(stops: readonly Pill[], index: number): Pill {
  const i = clamp(Math.floor(index), 0, Math.max(0, stops.length - 2));
  const from = stops[i];
  const to = stops.at(i + 1) ?? from;
  const t = clamp(index - i, 0, 1);
  return {
    target: from.target + (to.target - from.target) * t,
    span: from.span + (to.span - from.span) * t,
  };
}

/** Which way the liquid pours to `position` from `from`: an end stop always pours to that end. */
function headingTo(position: number, from: number, last: number) {
  if (position <= 0) {
    return -1;
  }
  return position >= last || position >= from ? 1 : -1;
}

/**
 * A Switch: its thumb from its `::before` and its own style, and the fill
 * its track takes when it toggles, from the colour of its `::after`. A
 * disabled Switch keeps its own dimmed thumb.
 */
function readThumb(record: EffectElementRecord): LiquidControl | null {
  const { element } = record;
  const thumb = getComputedStyle(element, "::before");
  const own = getComputedStyle(element);
  const diameter = Number.parseFloat(thumb.width);
  if (
    !(diameter > 0) ||
    finiteOr(Number.parseFloat(own.opacity), 1) < 1 ||
    element.matches(":disabled")
  ) {
    return null;
  }
  const radius = diameter / 2;
  const travel = Math.max(0, record.width - record.height) / radius;
  const fill = readFill(own.backgroundColor);
  const after = readFill(getComputedStyle(element, "::after").color);
  const other = after[3] > 0 ? after : fill;
  const on = (record.settings.liquid?.position ?? 0) >= 1;
  return {
    radius,
    originX: record.x + record.height / 2,
    originY: record.y + record.height / 2,
    travel,
    stops: [
      { target: 0, span: 0 },
      { target: travel, span: 0 },
    ],
    rings: [
      null,
      {
        box: ringLightBox(record),
        cornerExponent: record.cornerExponent,
        color: fill,
      },
    ],
    frost: {
      color: readFill(thumb.backgroundColor),
      under: fill,
      least: FROST,
      contrast: FROST_CONTRAST,
    },
    fill: on ? { off: other, on: fill } : { off: fill, on: other },
    spread: px(own.paddingTop),
  };
}

/**
 * A segmented control: one stop over each segment marked with
 * `LIQUID_SEGMENT`, in a pill as long as the segment, and the indicator's
 * look, from the element marked with `LIQUID_INDICATOR`. Its text colour is the ring light's colour.
 */
function readSegments(record: EffectElementRecord): LiquidControl | null {
  const { element } = record;
  const indicator = element.querySelector(`[${LIQUID_INDICATOR}]`);
  const segments = [...element.querySelectorAll(`[${LIQUID_SEGMENT}]`)].map(
    (segment) => segment.getBoundingClientRect(),
  );
  const radius = (segments.at(0)?.height ?? 0) / 2;
  if (indicator === null || !(radius > 0)) {
    return null;
  }
  const own = getComputedStyle(element);
  const look = getComputedStyle(indicator);
  const box = element.getBoundingClientRect();
  // The rects are in the viewport, and the record in the page.
  const toPageX = record.x - box.left;
  const toPageY = record.y - box.top;
  const left = box.left + px(own.borderLeftWidth) + px(own.paddingLeft);
  const right = box.right - px(own.borderRightWidth) - px(own.paddingRight);
  const corners = [
    look.borderTopLeftRadius,
    look.borderTopRightRadius,
    look.borderBottomRightRadius,
    look.borderBottomLeftRadius,
  ] as const;
  const cornerExponent = readCornerExponent(
    look.getPropertyValue("corner-top-left-shape"),
  );
  const color = readFill(look.color);
  const frost = readFill(look.backgroundColor);
  const cornerRadius = (segment: DOMRect) =>
    resolveCornerRadii(segment.width, segment.height, corners)[0];
  const opacity = Math.min(1, frost[3] / SEGMENT_FROST.core);
  return {
    radius,
    originX: left + radius + toPageX,
    originY: segments[0].top + radius + toPageY,
    travel: Math.max(0, (right - left) / radius - 2),
    stops: segments.map((segment) => {
      const start = (segment.left - left) / radius;
      const end = Math.max(start, (segment.right - left) / radius - 2);
      return { target: (start + end) / 2, span: (end - start) / 2 };
    }),
    rings: segments.map((segment) => ({
      box: {
        x: segment.left + toPageX,
        y: segment.top + toPageY,
        width: segment.width,
        height: segment.height,
        radius: cornerRadius(segment),
      },
      cornerExponent,
      color,
    })),
    frost: {
      color: frost,
      under: readFill(own.backgroundColor),
      least: {
        core: SEGMENT_FROST.core * opacity,
        edge: SEGMENT_FROST.edge * opacity,
      },
      contrast: NO_FLOOR,
    },
    fill: null,
    underGlow: { color, strength: SEGMENT_GLOW },
    corner: { radius: cornerRadius(segments[0]), exponent: cornerExponent },
    spread: px(own.paddingTop),
  };
}

const rgb = (color: EffectColor) => [color[0], color[1], color[2]] as const;

const dim = (color: readonly [number, number, number], light: number) =>
  [color[0] * light, color[1] * light, color[2] * light] as const;

/**
 * The colours of one control, which change only when its fills, its frost
 * or its backdrop do.
 */
function createLiquidColors() {
  return {
    track: lastResultOf(
      (
        color: EffectColor,
        under: EffectColor,
        least: FrostLevels,
        contrast: FrostLevels,
        onFill: EffectColor,
        backdrop: EffectColor,
        level: number,
      ) => {
        const thumb = rgb(color);
        const glow = glowColors(onFill, backdrop);
        const restGlow = restingGlow(
          rgb(onFill),
          isLightBackdrop(backdrop) ? rgb(glow.halo) : rgb(glow.core),
          thumb,
          REST_GLOW,
          contrast.core,
        );
        // At rest on the on fill, the thumb sits over the glow, and is as
        // opaque as it must be to keep its contrast over both.
        const restTracks = level === 1 ? [rgb(under), restGlow] : [rgb(under)];
        const frostOver = (least: number, contrast: number) =>
          Math.max(
            ...restTracks.map((track) =>
              frostOpacity(thumb, track, least, contrast),
            ),
          );
        return {
          restGlow,
          halo: rgb(glow.halo),
          frost: {
            core: frostOver(least.core, contrast.core),
            edge: frostOver(least.edge, contrast.edge),
          },
        };
      },
    ),
    ring: lastResultOf(ringLightPaint),
  };
}

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
  /** The liquid is on its way to a stop with a ring, which waits for it to land. */
  readonly landing: boolean;
  /** The ring, the stop it runs round, and the colour it took when it started. */
  readonly ring: {
    readonly light: RingLight;
    readonly stop: number;
    readonly color: EffectColor;
  } | null;
  /** When the effect took the control over, on the effect layer's clock. */
  readonly since: number;
  readonly colors: ReturnType<typeof createLiquidColors>;
  /** Seconds on the liquid's clock that the GPU has been given to simulate. */
  readonly simulated: number;
  /** The time on that clock that the body's particles are from. */
  readonly particlesAt: number;
}

/**
 * Steps one control's liquid and lays it out on the page. It rests in the
 * pill of the stop at `position`, or where a drag holds it. A new position
 * pours it there: the wall ahead is the far end of that stop's pill, so it
 * lands there and sloshes against it, and where the stop has a ring, the
 * ring light runs from where it lands.
 *
 * The GPU moves the particles, in the slot `slot` of the simulation
 * buffer: each frame the liquid moves, this returns the step for the GPU
 * to run, and reads the particles the GPU last sent back, `moved`, to
 * settle the body. Those are a frame or so old, which the settling
 * tolerates. The body's own particles go to the GPU when `seed` is
 * returned: for a new body, under reduced motion, and once the body has
 * settled.
 *
 * @internal
 */
export function layoutLiquid(
  control: LiquidControl,
  record: Pick<EffectElementRecord, "id" | "settings">,
  elementIndex: number,
  slot: number,
  state: LiquidState | undefined,
  frame: Pick<EffectFrame, "time" | "delta" | "reducedMotion">,
  backdrop: EffectColor,
  moved: LiquidSnapshot | null,
  beads: LiquidBeadInstance[],
): {
  state: LiquidState;
  instance: LiquidInstance;
  ring:
    | (Omit<RingLightInstance, "elementIndex" | "state"> & {
        readonly ring: RingLight;
      })
    | null;
  /** Something moves, so the next frame must follow. */
  animating: boolean;
  /** The step for the GPU to run on the body's slot this frame, or `null`. */
  step: LiquidStep | null;
  /** Put the body's particles into its slot before the step. */
  seed: boolean;
} {
  const settings = record.settings.liquid ?? EFFECT_SETTING_DEFAULTS.liquid;
  const { radius, travel, stops, rings, originX, originY } = control;
  const last = stops.length - 1;
  const position = clamp(finiteOr(settings.position, 0), 0, last);
  const drag =
    settings.drag === null ? null : clamp(finiteOr(settings.drag, 0), 0, last);
  const pressed = settings.pressed;
  const held = drag !== null;
  const aim = held ? 0 : clamp(finiteOr(settings.aim, 0), -1, 1);
  const { target, span } = pillAt(stops, drag ?? position);
  const stop = pillAt(stops, position);

  let body = state?.body ?? restingLiquid(target, { seed: record.id, span });
  let heading = state?.heading ?? headingTo(position, position, last);
  let landing = state?.landing ?? false;
  let ring = state?.ring ?? null;
  if (state !== undefined && position !== state.position) {
    heading = headingTo(position, state.drag ?? state.position, last);
    landing = (rings[position] ?? null) !== null;
  }
  if (state !== undefined && (target !== state.target || span !== state.span)) {
    // The drawn surface settles into the rest pill as the body calms. A new
    // target moves that pill at once, so the body is not calm until it has
    // arrived there.
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
    reducedMotion: frame.reducedMotion,
    aim,
  };
  // A new body rests as laid out: a step would move the particles towards
  // their own spacing and melt the thumb for no reason.
  const resting =
    body.settled &&
    (state === undefined ||
      (target === state.target &&
        span === state.span &&
        pressed === state.pressed));
  const delta = frame.delta > 0 ? frame.delta : FIRST_STEP;
  let simulated = state?.simulated ?? 0;
  let particlesAt = state?.particlesAt ?? 0;
  let seed = state === undefined;
  let step: LiquidStep | null = null;
  if (!resting && frame.reducedMotion) {
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
    if (body.settled) {
      seed = true;
    } else {
      step = {
        slot,
        count: body.x.length,
        target,
        span,
        aim,
        scale: body.scale,
        from: input.from,
        to: input.to,
        step: liquidStep(delta),
      };
    }
  }
  if (seed) {
    particlesAt = simulated;
  }
  if (step !== null) {
    simulated += step.step;
  }
  // The track is all one fill, which goes from off to on as the on fill
  // rises through it: with the liquid while a drag holds it, and on its
  // own after a toggle.
  const { fill } = control;
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
      : stepRise(state.rise, riseGoal, delta, frame.reducedMotion);
  const onFill = fill?.on ?? control.underGlow?.color ?? control.frost.under;
  const offFill = fill?.off ?? control.frost.under;
  const since = state?.since ?? frame.time;
  // Under reduced motion no frame follows on its own, so the effect takes
  // over at once.
  const plain = frame.reducedMotion
    ? 0
    : clamp(1 - (frame.time - since) / FREEZE_IN_SECONDS, 0, 1);
  const colors = state?.colors ?? createLiquidColors();
  const { restGlow, halo, frost } = colors.track(
    control.frost.color,
    control.frost.under,
    control.frost.least,
    control.frost.contrast,
    onFill,
    backdrop,
    level,
  );
  // The on fill and its glow are dim under the clear liquid, and brighten
  // as it freezes.
  const light = THAWED_LIGHT + (1 - THAWED_LIGHT) * body.set;
  const landsOn = rings[position] ?? null;
  if (landing && landsOn !== null) {
    const wall = stop.target + heading * stop.span;
    // A long body can touch the far wall of a short stop next to it before
    // most of it is there. The liquid lands only when its middle is in the
    // pill of the stop.
    const arrived = heading * (mean(body.x) - stop.target) >= -(stop.span + 1);
    const impact = arrived ? impactOn(body, wall, heading) : null;
    if (frame.reducedMotion || impact !== null) {
      landing = false;
      const { box } = landsOn;
      ring = {
        light: {
          start: frame.time,
          x:
            impact === null
              ? heading > 0
                ? box.x + box.width
                : box.x
              : originX + impact.x * radius,
          y: originY + (impact?.y ?? 0) * radius,
        },
        stop: position,
        color: landsOn.color,
      };
    }
  }
  if (
    ring !== null &&
    frame.time >= ringLightEnd(ring.light, frame.reducedMotion)
  ) {
    ring = null;
  }
  const ringsOn = ring === null ? null : (rings[ring.stop] ?? null);

  const firstBead = beads.length;
  for (const bead of body.beads) {
    beads.push({
      x: originX + bead.x * radius,
      y: originY + bead.y * radius,
      radius: beadRadius(bead) * radius,
    });
  }
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
      landing,
      ring,
      since,
      colors,
      simulated,
      particlesAt,
    },
    step,
    seed,
    ring:
      ring === null || ringsOn === null
        ? null
        : {
            ring: ring.light,
            box: ringsOn.box,
            cornerExponent: ringsOn.cornerExponent,
            ...colors.ring(ring.color, backdrop),
          },
    // While a drag holds the liquid short of its stop, it cannot land
    // there, so it waits for no frame.
    animating:
      !body.settled ||
      (landing && target === stop.target) ||
      plain > 0 ||
      rise.level !== riseGoal,
    instance: {
      elementIndex,
      slot,
      particleCount: body.x.length,
      firstBead,
      beadCount: body.beads.length,
      radius,
      calm: body.calm,
      originX,
      originY,
      restX: target * radius,
      span: span * radius,
      scale: body.scale,
      spread: control.spread,
      centreX: mean(body.x) * radius,
      centreY: mean(body.y) * radius,
      thumb: rgb(control.frost.color),
      set: body.set,
      plain,
      frost,
      off: rgb(offFill),
      on: dim(rgb(onFill), light),
      rise: rise.level,
      riseGoal,
      cover: rise.level > 0 || riseGoal > 0,
      // The glow fades in as the effect takes over from the control's flat
      // fill, so that nothing jumps.
      glow: {
        color: dim(fill === null ? halo : restGlow, light),
        strength: fill === null ? 0 : 1 - plain,
      },
      underGlow:
        control.underGlow &&
        control.underGlow.strength[
          isLightBackdrop(backdrop) ? "light" : "dark"
        ] *
          (1 - plain),
      corner: control.corner,
      backdrop: rgb(backdrop),
    },
  };
}

/** A copy of the simulation buffer on its way back to the CPU. */
interface Readback {
  readonly buffer: GPUBuffer;
  busy: boolean;
}

/** A body the GPU stepped this frame, whose slot the readback carries. */
interface Stepped {
  readonly id: number;
  readonly step: LiquidStep;
  /** The time on the liquid's clock that the step takes the body to. */
  readonly time: number;
}

/**
 * Liquid: draws the thumb of each Switch with the role as a body of liquid
 * on the track, in the colour and at the size of the thumb the Switch draws
 * itself, and covers the track with the fill that rises or sinks under it,
 * as `useLiquid` describes, and a segmented control's indicator in the same
 * way, in a pill over the selected segment, with no fill. It marks the control with
 * `markEffectDrawn` while it draws, so the control hides its own thumb or
 * indicator only then. It asks for frames only while something moves.
 *
 * The particles live on the GPU, in a slot of the simulation buffer for
 * each control, where a compute pass moves them each frame the liquid
 * moves and the render pass draws them from. The CPU keeps the rest of
 * the body: it reads the particles back once the GPU is done with them,
 * without waiting, so each frame settles the body on particles a frame or
 * so old.
 *
 * @internal
 */
export const liquidEffect: Effect = {
  async setup(setup) {
    const { device, format, pageLayout, targetLayout } = setup;
    const liquidLayout = device.createBindGroupLayout({
      entries: [0, 1, 2].map((binding) => ({
        binding,
        visibility: GPU_SHADER_STAGE.VERTEX | GPU_SHADER_STAGE.FRAGMENT,
        buffer: { type: "read-only-storage" as const },
      })),
    });
    const computeLayout = device.createBindGroupLayout({
      entries: (["read-only-storage", "storage"] as const).map(
        (type, binding) => ({
          binding,
          visibility: GPU_SHADER_STAGE.COMPUTE,
          buffer: { type },
        }),
      ),
    });
    const liquidModule = device.createShaderModule({ code: LIQUID_WGSL });
    const computeModule = device.createShaderModule({
      code: LIQUID_COMPUTE_WGSL,
    });
    // A ring starts only after a toggle lands, so the liquid does not wait
    // for the ring's pipeline, and a ring has no draw until it is ready.
    const ringRenderer = createRingLightRenderer(setup);
    const [liquidPipeline, simulatePipeline] = await Promise.all([
      device.createRenderPipelineAsync({
        layout: device.createPipelineLayout({
          bindGroupLayouts: [pageLayout, targetLayout, liquidLayout],
        }),
        vertex: { module: liquidModule, entryPoint: "liquidVertex" },
        fragment: {
          module: liquidModule,
          entryPoint: "liquidFragment",
          targets: [{ format, blend: PREMULTIPLIED_BLEND }],
        },
        primitive: { topology: "triangle-strip" },
      }),
      device.createComputePipelineAsync({
        layout: device.createPipelineLayout({
          bindGroupLayouts: [computeLayout],
        }),
        compute: { module: computeModule, entryPoint: "simulate" },
      }),
    ]);

    const instanceBuffer = createPackedBuffer(
      device,
      LIQUID_INSTANCE_BYTES,
      packLiquidInstances,
    );
    const beadBuffer = createPackedBuffer(device, BEAD_BYTES, packLiquidBeads);
    const stepBuffer = createPackedBuffer(
      device,
      LIQUID_STEP_BYTES,
      packLiquidSteps,
    );
    const slotFloats = new Float32Array(LIQUID_SLOT_WORDS);
    const slots = new Map<number, number>();
    const freeSlots: number[] = [];
    let readbacks: Readback[] = [];
    const latest = new Map<number, LiquidSnapshot>();
    let destroyed = false;

    function createSlotBuffer(capacity: number) {
      return {
        capacity,
        buffer: device.createBuffer({
          size: capacity * LIQUID_SLOT_BYTES,
          usage:
            GPU_BUFFER_USAGE.STORAGE |
            GPU_BUFFER_USAGE.COPY_DST |
            GPU_BUFFER_USAGE.COPY_SRC,
        }),
      };
    }

    /** The simulation buffer: one slot for each body. */
    let slotBuffer = createSlotBuffer(MIN_SLOT_CAPACITY);

    /**
     * Makes room for `count` slots, and keeps the particles in the slots
     * that there are.
     */
    function ensureSlotCapacity(count: number) {
      if (count <= slotBuffer.capacity) {
        return;
      }
      const { buffer } = slotBuffer;
      slotBuffer = createSlotBuffer(2 ** Math.ceil(Math.log2(count)));
      // The copy must occur before this frame writes to the new buffer.
      // Thus the copy goes to the queue now, and not in the frame's encoder.
      const copy = device.createCommandEncoder();
      copy.copyBufferToBuffer(buffer, 0, slotBuffer.buffer, 0, buffer.size);
      device.queue.submit([copy.finish()]);
      buffer.destroy();
    }

    function slotOf(id: number) {
      let slot = slots.get(id);
      if (slot === undefined) {
        slot = freeSlots.pop() ?? slots.size;
        slots.set(id, slot);
      }
      return slot;
    }

    function writeSlot(slot: number, body: LiquidBody) {
      packLiquidSlot(body, slotFloats);
      device.queue.writeBuffer(
        slotBuffer.buffer,
        slot * LIQUID_SLOT_BYTES,
        slotFloats,
      );
    }

    /**
     * Copies the simulation buffer to a readback buffer, and maps it once
     * the GPU has filled it. With every readback buffer still on its way,
     * the particles wait for the next frame.
     */
    function readBack(encoder: GPUCommandEncoder, stepped: readonly Stepped[]) {
      const { buffer } = slotBuffer;
      readbacks = readbacks.filter((candidate) => {
        const stale = !candidate.busy && candidate.buffer.size !== buffer.size;
        if (stale) {
          candidate.buffer.destroy();
        }
        return !stale;
      });
      let readback = readbacks.find((candidate) => !candidate.busy);
      if (readback === undefined) {
        if (readbacks.length >= MAX_READBACKS) {
          return;
        }
        readback = {
          buffer: device.createBuffer({
            size: buffer.size,
            usage: GPU_BUFFER_USAGE.MAP_READ | GPU_BUFFER_USAGE.COPY_DST,
          }),
          busy: false,
        };
        readbacks.push(readback);
      }
      const { buffer: target } = readback;
      readback.busy = true;
      const slotsRead = stepped.map(({ step }) => step.slot);
      const start = Math.min(...slotsRead) * LIQUID_SLOT_BYTES;
      const size = (Math.max(...slotsRead) + 1) * LIQUID_SLOT_BYTES - start;
      encoder.copyBufferToBuffer(buffer, start, target, start, size);
      // The effect layer submits this encoder right after the update, in
      // the same task. A map requested before that submit would not wait
      // for the copy, so the request goes in a microtask, which runs after
      // the submit.
      queueMicrotask(() => {
        target.mapAsync(GPU_MAP_MODE.READ, start, size).then(
          () => {
            if (!destroyed) {
              const floats = new Float32Array(
                target.getMappedRange(start, size),
              );
              for (const { id, step, time } of stepped) {
                latest.set(id, {
                  particles: readLiquidSlot(
                    floats,
                    step.slot * LIQUID_SLOT_WORDS - start / 4,
                    step.count,
                  ),
                  time,
                });
              }
              target.unmap();
            }
            readback.busy = false;
          },
          () => {
            readback.busy = false;
          },
        );
      });
    }

    const slotBinding = {
      get buffer() {
        return slotBuffer.buffer;
      },
    };
    const computeBinding = createBinding(device, computeLayout, [
      stepBuffer,
      slotBinding,
    ]);
    const liquidBinding = createBinding(device, liquidLayout, [
      instanceBuffer,
      slotBinding,
      beadBuffer,
    ]);

    const states = new Map<number, LiquidState>();
    const drawn = new Set<Element>();
    let instances: readonly LiquidInstance[] = [];

    return {
      update(encoder, frame) {
        const controls = frame.elements.flatMap((record, index) => {
          if ((record.roles & LIQUID) === 0) {
            return [];
          }
          const control = readSegments(record) ?? readThumb(record);
          return control === null
            ? []
            : [{ index, record, control, slot: slotOf(record.id) }];
        });
        ensureSlotCapacity(slots.size);
        const nextInstances: LiquidInstance[] = [];
        const nextRings: RingLightDraw[] = [];
        const beads: LiquidBeadInstance[] = [];
        const steps: LiquidStep[] = [];
        const stepped: Stepped[] = [];
        const seen = new Set<Element>();
        const kept = new Set<number>();
        let animating = false;
        for (const { index, record, control, slot } of controls) {
          const { id } = record;
          const laid = layoutLiquid(
            control,
            record,
            index,
            slot,
            states.get(id),
            frame,
            frame.scopes[record.scopeIndex].backdrop,
            latest.get(id) ?? null,
            beads,
          );
          seen.add(record.element);
          kept.add(id);
          states.set(id, laid.state);
          nextInstances.push(laid.instance);
          animating ||= laid.animating;
          if (laid.seed) {
            writeSlot(slot, laid.state.body);
          }
          if (laid.step !== null) {
            steps.push(laid.step);
            stepped.push({ id, step: laid.step, time: laid.state.simulated });
          }
          if (laid.ring === null) {
            continue;
          }
          const { ring, ...look } = laid.ring;
          const ringState = ringLightAt(
            ring,
            look.box,
            frame.time,
            frame.reducedMotion,
          );
          if (ringState === null) {
            continue;
          }
          animating = true;
          nextRings.push({
            elementIndex: index,
            state: ringState,
            end: ringLightEnd(ring, frame.reducedMotion),
            ...look,
          });
        }
        for (const id of states.keys()) {
          if (!kept.has(id)) {
            states.delete(id);
            latest.delete(id);
            const slot = slots.get(id);
            if (slot !== undefined) {
              slots.delete(id);
              freeSlots.push(slot);
            }
          }
        }
        for (const element of drawn) {
          if (!seen.has(element)) {
            drawn.delete(element);
            markEffectDrawn(element, false);
          }
        }
        instances = nextInstances;
        instanceBuffer.write(nextInstances);
        beadBuffer.write(beads);
        stepBuffer.write(steps);
        if (steps.length > 0) {
          const pass = encoder.beginComputePass();
          pass.setPipeline(simulatePipeline);
          pass.setBindGroup(0, computeBinding());
          pass.dispatchWorkgroups(steps.length);
          pass.end();
          readBack(encoder, stepped);
        }
        ringRenderer.update(nextRings, frame);
        for (const element of seen) {
          if (!drawn.has(element)) {
            drawn.add(element);
            markEffectDrawn(element, true);
          }
        }
        return animating;
      },
      draw(pass, target) {
        const [first, count] = instanceRange(
          instances,
          target.firstElement,
          target.elementCount,
        );
        if (count > 0) {
          pass.setPipeline(liquidPipeline);
          pass.setBindGroup(2, liquidBinding());
          pass.draw(4, count, 0, first);
        }
        ringRenderer.draw(pass, target);
      },
      destroy() {
        destroyed = true;
        ringRenderer.destroy();
        for (const element of drawn) {
          markEffectDrawn(element, false);
        }
        drawn.clear();
        instanceBuffer.destroy();
        beadBuffer.destroy();
        stepBuffer.destroy();
        slotBuffer.buffer.destroy();
        for (const { buffer } of readbacks) {
          buffer.destroy();
        }
      },
    };
  },
};
