import { clamp } from "../clamp.ts";
import {
  GPU_BUFFER_USAGE,
  GPU_MAP_MODE,
  GPU_SHADER_STAGE,
} from "./constants.ts";
import { createBinding } from "./create-binding.ts";
import { createInstancedDraw } from "./create-instanced-draw.ts";
import { createPackedBuffer } from "./create-packed-buffer.ts";
import { roleBits } from "./effect-roles.ts";
import {
  EFFECT_SETTING_DEFAULTS,
  finiteOr,
} from "./effect-setting-defaults.ts";
import { handBack } from "./hand-back.stylex.ts";
import {
  LIQUID_COMPUTE_WGSL,
  LIQUID_STEP_BYTES,
  packLiquidSteps,
  type LiquidStep,
} from "./liquid-compute-wgsl.ts";
import type { LiquidControl, Pill } from "./liquid-reader.ts";
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
  type TrackRing,
} from "./liquid-wgsl.ts";
import { markEffectDrawn } from "./mark-effect-drawn.ts";
import type { EffectColor } from "./parse-css-color.ts";
import { srgbToOklab } from "./ripple-color.ts";
import { stepGlint } from "./step-glint.ts";
import {
  beadRadius,
  finiteParticles,
  frozenLiquid,
  LINGER_SET,
  liquidStep,
  mean,
  restingLiquid,
  settleOnSnapshot,
  type LiquidBody,
  type LiquidSnapshot,
} from "./step-liquid.ts";
import { stepRise, type Rise } from "./step-rise.ts";
import type {
  Effect,
  EffectElementRecord,
  EffectFrame,
  EffectSetup,
} from "./types.ts";

const LIQUID = roleBits(["liquid"]);
const BEAD_BYTES = 16;
const MIN_SLOT_CAPACITY = 4;
/**
 * How many copies of the simulation buffer can be on their way back to
 * the CPU at once: one is read while the next is being copied, and a
 * third covers a map that takes a frame longer.
 */
const MAX_READBACKS = 3;
/**
 * A frame with no measured time, the first after the loop was idle, steps
 * this far.
 */
const FIRST_STEP = 1 / 60;

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
  /** How much the last move lifts the glint on the lit edge, as `stepGlint` gives it. */
  readonly glint: number;
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

/** The selected surface as it shows over the track: its fill over the track's. */
function solidOf(control: LiquidControl, under: EffectColor) {
  const { color } = control;
  const a = color[3];
  return [
    under[0] + (color[0] - under[0]) * a,
    under[1] + (color[1] - under[1]) * a,
    under[2] + (color[2] - under[2]) * a,
  ] as const;
}

const palettes = new WeakMap<
  LiquidControl,
  {
    readonly under: EffectColor;
    readonly solid: readonly [number, number, number];
    readonly lightBody: boolean;
  }
>();

/**
 * The colour of a control's surface over its track, `under`, worked out
 * once for each read of the control and each fill under it.
 */
function paletteOf(control: LiquidControl, under: EffectColor) {
  const cached = palettes.get(control);
  if (cached?.under === under) {
    return cached;
  }
  const solid = solidOf(control, under);
  const palette = { under, solid, lightBody: srgbToOklab(solid)[0] > 0.7 };
  palettes.set(control, palette);
  return palette;
}

/**
 * Steps one control's liquid and lays it out on the page. It rests in the
 * pill of the stop at `position`, or where a drag holds it, and there the
 * control draws its own solid surface, with a lit edge from the effect over
 * it. A new position pours the liquid there: it melts into water, pours
 * over, lands on the wall ahead, the far end of that stop's pill, and
 * sloshes against it. It flows on for about 0.8 s after it arrives, and
 * sets into the control's solid surface as it settles. As the lit edge
 * comes back, the glint on it is brighter after a faster move, and it fades
 * to its rest look.
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
  backdrop: EffectColor,
  moved: LiquidSnapshot | null,
  beads: LiquidBeadInstance[],
): {
  state: LiquidState;
  instance: LiquidInstance;
  /** The effect draws the surface, so the control hides its own. */
  drawn: boolean;
  /** Something moves, so the next frame must follow. */
  animating: boolean;
  /** The step for the GPU to run on the body's slot this frame, or `null`. */
  step: LiquidStep | null;
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
  if (pillMoved && !relaid) {
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
    reducedMotion: reduced,
    aim: 0,
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
  let step: LiquidStep | null = null;
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
        slot,
        count: body.x.length,
        target,
        span,
        aim: 0,
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
  const glint = stepGlint(state?.glint ?? 0, body, delta, reduced);
  // The lit edge is the solid surface's, so it shows only as the liquid sets
  // past the core it keeps while it lingers.
  const edgeLit =
    clamp((body.set - LINGER_SET) / (1 - LINGER_SET), 0, 1) * fadeIn;

  const firstBead = beads.length;
  for (const bead of body.beads) {
    beads.push({
      x: originX + bead.x * radius,
      y: originY + bead.y * radius,
      radius: beadRadius(bead) * radius,
    });
  }
  // A track with no fill of its own shows the page.
  const under = control.under[3] > 0 ? control.under : backdrop;
  const { solid, lightBody } = paletteOf(control, under);
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
      glint,
      simulated,
      particlesAt,
      fade,
    },
    step,
    seed,
    fading: fade !== null,
    drawn: active && handFrom === null,
    animating:
      !body.settled ||
      rise.level !== riseGoal ||
      (glint !== 0 && edgeLit > 0) ||
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
      calm: body.calm * body.calm,
      originX,
      originY,
      restX: target * radius,
      span: span * radius,
      scale: body.scale,
      spread: control.spread,
      centreX: centreX * radius,
      centreY: mean(body.y) * radius,
      thumb: solid,
      set: body.set,
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
      glint,
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
 * Liquid: draws the selected surface of each control with the role, a
 * Switch's thumb or a segmented control's indicator, as a body of liquid
 * while it moves, in the colour and at the size of the one the control
 * draws itself, as `useLiquid` describes. On a Switch it also covers the
 * track with the fill that rises or sinks under it. It marks the control
 * with `markEffectDrawn` while it draws the surface, so the control hides
 * its own only then. At rest it draws only a lit edge over the control's
 * own surface. It asks for frames only while something moves.
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
  async setup(setup: EffectSetup) {
    const { device } = setup;
    const computeLayout = device.createBindGroupLayout({
      entries: (["read-only-storage", "storage"] as const).map(
        (type, binding) => ({
          binding,
          visibility: GPU_SHADER_STAGE.COMPUTE,
          buffer: { type },
        }),
      ),
    });
    const computeModule = device.createShaderModule({
      code: LIQUID_COMPUTE_WGSL,
    });
    const [liquid, simulatePipeline] = await Promise.all([
      createInstancedDraw(setup, LIQUID_WGSL, "liquid", 3),
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
    const liquidBinding = createBinding(device, liquid.layout, [
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
          const control = record.readings.liquid;
          return control == null
            ? []
            : [{ index, record, control, slot: slotOf(record.id) }];
        });
        ensureSlotCapacity(slots.size);
        const nextInstances: LiquidInstance[] = [];
        const beads: LiquidBeadInstance[] = [];
        const steps: LiquidStep[] = [];
        const stepped: Stepped[] = [];
        const seen = new Set<Element>();
        const kept = new Set<number>();
        let animating = false;
        let fading = false;
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
          if (laid.drawn) {
            seen.add(record.element);
          }
          kept.add(id);
          states.set(id, laid.state);
          nextInstances.push(laid.instance);
          animating ||= laid.animating;
          fading ||= laid.fading;
          if (laid.seed) {
            writeSlot(slot, laid.state.body);
          }
          if (laid.step !== null) {
            steps.push(laid.step);
            stepped.push({ id, step: laid.step, time: laid.state.simulated });
          }
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
        for (const element of seen) {
          if (!drawn.has(element)) {
            drawn.add(element);
            markEffectDrawn(element, true);
          }
        }
        if (fading) {
          setup.requestFrame();
        }
        return animating;
      },
      draw(pass, target) {
        liquid.draw(pass, target, instances, liquidBinding);
      },
      destroy() {
        destroyed = true;
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
