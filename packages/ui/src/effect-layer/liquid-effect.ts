import { GPU_SHADER_STAGE, PREMULTIPLIED_BLEND } from "./constants.ts";
import { createPackedBuffer } from "./create-packed-buffer.ts";
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
  ringLightColors,
} from "./glow-colors.ts";
import { instanceRange } from "./instance-range.ts";
import {
  LIQUID_INSTANCE_BYTES,
  LIQUID_WGSL,
  packLiquidBeads,
  packLiquidInstances,
  packLiquidParticles,
  type LiquidBeadInstance,
  type LiquidInstance,
  type LiquidParticle,
} from "./liquid-wgsl.ts";
import { markEffectDrawn } from "./mark-effect-drawn.ts";
import type { EffectColor } from "./parse-css-color.ts";
import { readFill } from "./read-element-box.ts";
import {
  ringLightAt,
  ringLightEnd,
  type RingLight,
  type RingLightBox,
} from "./ring-light-at.ts";
import {
  packRingLightInstances,
  RING_LIGHT_LOOK,
  RING_LIGHT_INSTANCE_BYTES,
  RING_LIGHT_WGSL,
  type RingLightInstance,
} from "./ring-light-wgsl.ts";
import { isLightBackdrop } from "./ripple-color.ts";
import {
  beadRadius,
  PARTICLE_COUNT,
  restingLiquid,
  impactOn,
  mean,
  stepLiquid,
  type LiquidBody,
} from "./step-liquid.ts";
import { stepRise, type Rise } from "./step-rise.ts";
import type { Effect, EffectElementRecord, EffectFrame } from "./types.ts";

const LIQUID = roleBits(["liquid"]);
const PARTICLE_BYTES = 8;
const BEAD_BYTES = 16;
/** A frame with no measured time, the first, steps this far. */
const FIRST_STEP = 1 / 60;
/**
 * Seconds the plain thumb takes to freeze into ice once the effect takes
 * over from the Switch, so that nothing jumps.
 */
const FREEZE_IN_SECONDS = 0.4;
/** How opaque the frozen thumb is at least, at its core and at its edge. */
const FROST = { core: 0.72, edge: 0.5 } as const;
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

interface LiquidState {
  readonly body: LiquidBody;
  /** How far the on fill has risen through the track, from 0 off to 1 on. */
  readonly rise: Rise;
  /** The thumb's resting place, as a share of the travel, at the last frame. */
  readonly position: number;
  /** The target of the last step, in rest radii. */
  readonly target: number;
  /** A pointer was down on the Switch at the last step. */
  readonly pressed: boolean;
  /** The liquid is on its way to the on end, and the ring waits for it to land. */
  readonly landing: boolean;
  readonly ring: RingLight | null;
  /** The fill the ring took when it started. */
  readonly ringFill: EffectColor;
  /** When the effect took the thumb over, on the effect layer's clock. */
  readonly since: number;
  readonly colors: LiquidColors;
}

/**
 * What the Switch's thumb looks like, from its `::before` and its own
 * style, and the fill its track takes when it toggles, from the colour of
 * its `::after`.
 */
function readThumb(element: Element) {
  const thumb = getComputedStyle(element, "::before");
  const own = getComputedStyle(element);
  const diameter = Number.parseFloat(thumb.width);
  return {
    color: readFill(thumb.backgroundColor),
    diameter: Number.isFinite(diameter) && diameter > 0 ? diameter : null,
    fill: readFill(own.backgroundColor),
    otherFill: readFill(getComputedStyle(element, "::after").color),
    opacity: finiteOr(Number.parseFloat(own.opacity), 1),
  };
}

const rgb = (color: EffectColor) => [color[0], color[1], color[2]] as const;

const dim = (color: readonly [number, number, number], light: number) =>
  [color[0] * light, color[1] * light, color[2] * light] as const;

function boxOf(record: EffectElementRecord): RingLightBox {
  return {
    x: record.x,
    y: record.y,
    width: record.width,
    height: record.height,
    radius: Math.min(...record.radii),
  };
}

/** Keeps the last result, and computes again only for different arguments. */
function lastResultOf<Args extends readonly unknown[], Result>(
  compute: (...args: Args) => Result,
) {
  let last: { args: Args; result: Result } | null = null;
  return (...args: Args) => {
    if (last === null || args.some((arg, index) => arg !== last?.args[index])) {
      last = { args, result: compute(...args) };
    }
    return last.result;
  };
}

/**
 * The colours of one Switch, which change only when its fills, its thumb or
 * its backdrop do.
 */
function createLiquidColors() {
  return {
    track: lastResultOf(
      (
        thumb: EffectColor,
        fill: EffectColor,
        onFill: EffectColor,
        backdrop: EffectColor,
        level: number,
      ) => {
        const glow = glowColors(onFill, backdrop);
        const restGlow = restingGlow(
          rgb(onFill),
          isLightBackdrop(backdrop) ? rgb(glow.halo) : rgb(glow.core),
          rgb(thumb),
          REST_GLOW,
          FROST_CONTRAST.core,
        );
        // At rest on the on fill, the thumb sits over the glow, and is as
        // opaque as it must be to keep its contrast over both.
        const restTracks = level === 1 ? [rgb(fill), restGlow] : [rgb(fill)];
        const frostOver = (least: number, contrast: number) =>
          Math.max(
            ...restTracks.map((track) =>
              frostOpacity(rgb(thumb), track, least, contrast),
            ),
          );
        return {
          restGlow,
          frost: {
            core: frostOver(FROST.core, FROST_CONTRAST.core),
            edge: frostOver(FROST.edge, FROST_CONTRAST.edge),
          },
        };
      },
    ),
    ring: lastResultOf((fill: EffectColor, backdrop: EffectColor) => {
      const { core, tint, bloom } = ringLightColors(fill, backdrop);
      const look = isLightBackdrop(backdrop)
        ? RING_LIGHT_LOOK.light
        : RING_LIGHT_LOOK.dark;
      return {
        core,
        tint,
        bloom: [bloom[0], bloom[1], bloom[2], look.bloom] as const,
        alpha: Math.sqrt(fill[3]),
        inset: look.inset,
        pageTint: look.pageTint,
      };
    }),
  };
}

type LiquidColors = ReturnType<typeof createLiquidColors>;

/**
 * Steps one Switch's liquid and lays it out on the page, or gives `null`
 * for a Switch the effect leaves alone: one with no thumb to read, or a
 * disabled one, which keeps its own dimmed thumb.
 */
function layoutLiquid(
  record: EffectElementRecord,
  elementIndex: number,
  state: LiquidState | undefined,
  frame: EffectFrame,
  particles: LiquidParticle[],
  beads: LiquidBeadInstance[],
): {
  state: LiquidState;
  instance: LiquidInstance;
  /** Something moves, so the next frame must follow. */
  animating: boolean;
} | null {
  const { element } = record;
  const thumb = readThumb(element);
  if (
    thumb.diameter === null ||
    thumb.opacity < 1 ||
    element.matches(":disabled")
  ) {
    return null;
  }
  const settings = record.settings.liquid ?? EFFECT_SETTING_DEFAULTS.liquid;
  const radius = thumb.diameter / 2;
  const travel = Math.max(0, record.width - record.height) / radius;
  const position = clamp(finiteOr(settings.position, 0), 0, 1);
  const drag =
    settings.drag === null ? null : clamp(finiteOr(settings.drag, 0), 0, 1);
  const target = (drag ?? position) * travel;
  const pressed = settings.pressed;
  const held = drag !== null;
  const aim = held ? 0 : clamp(finiteOr(settings.aim, 0), -1, 1);

  let body = state?.body ?? restingLiquid(target, record.id);
  let landing = state?.landing ?? false;
  let ring = state?.ring ?? null;
  let ringFill = state?.ringFill ?? thumb.fill;
  const toggled = state !== undefined && position !== state.position;
  if (toggled) {
    landing = position === 1;
  }
  if (state !== undefined && target !== state.target) {
    // The drawn surface settles into a circle at the target as the body
    // calms. A new target moves that circle at once, so the body is not
    // calm until it has arrived there.
    body = { ...body, calm: 0 };
  }
  const input = {
    target,
    travel,
    pressed,
    reducedMotion: frame.reducedMotion,
    aim,
  };
  // A new body rests as laid out: a step would move the particles towards
  // their own spacing and melt the thumb for no reason.
  const resting =
    body.settled &&
    (state === undefined ||
      (target === state.target && pressed === state.pressed));
  const delta = frame.delta > 0 ? frame.delta : FIRST_STEP;
  if (!resting) {
    body = stepLiquid(body, input, delta);
  }
  // The track is all one fill, which goes from off to on as the on fill
  // rises through it: with the liquid while a drag holds it, and on its
  // own after a toggle.
  const level = position === 1 ? 1 : 0;
  const riseGoal =
    held && travel > 0 ? clamp(mean(body.x) / travel, 0, 1) : level;
  const rise =
    state === undefined
      ? { level, speed: 0 }
      : stepRise(state.rise, riseGoal, delta, frame.reducedMotion);
  const otherFill = thumb.otherFill[3] > 0 ? thumb.otherFill : thumb.fill;
  const onFill = position === 1 ? thumb.fill : otherFill;
  const offFill = position === 1 ? otherFill : thumb.fill;
  const since = state?.since ?? frame.time;
  // Under reduced motion no frame follows on its own, so the effect takes
  // over at once.
  const plain = frame.reducedMotion
    ? 0
    : clamp(1 - (frame.time - since) / FREEZE_IN_SECONDS, 0, 1);
  const { backdrop } = frame.scopes[record.scopeIndex];
  const colors = state?.colors ?? createLiquidColors();
  const { restGlow, frost } = colors.track(
    thumb.color,
    thumb.fill,
    onFill,
    backdrop,
    level,
  );
  // The on fill and its glow are dim under the clear liquid, and brighten
  // as it freezes.
  const light = THAWED_LIGHT + (1 - THAWED_LIGHT) * body.set;
  const originX = record.x + record.height / 2;
  const originY = record.y + record.height / 2;
  const impact = landing ? impactOn(body, travel) : null;
  if (landing && (frame.reducedMotion || impact !== null)) {
    landing = false;
    ring = {
      start: frame.time,
      x:
        impact === null ? record.x + record.width : originX + impact.x * radius,
      y: originY + (impact?.y ?? 0) * radius,
    };
    ringFill = thumb.fill;
  }
  if (ring !== null && frame.time >= ringLightEnd(ring, frame.reducedMotion)) {
    ring = null;
  }

  const firstParticle = particles.length;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x: originX + body.x[i] * radius,
      y: originY + body.y[i] * radius,
    });
  }
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
      target,
      pressed,
      landing,
      ring,
      ringFill,
      since,
      colors,
    },
    // While a drag holds the liquid short of the on end, it cannot land
    // there, so it waits for no frame.
    animating:
      !body.settled ||
      (landing && target === travel) ||
      plain > 0 ||
      rise.level !== riseGoal,
    instance: {
      elementIndex,
      firstParticle,
      particleCount: PARTICLE_COUNT,
      firstBead,
      beadCount: body.beads.length,
      radius,
      calm: body.calm,
      originX,
      originY,
      restX: target * radius,
      centreX: mean(body.x) * radius,
      centreY: mean(body.y) * radius,
      thumb: rgb(thumb.color),
      set: body.set,
      plain,
      frost,
      off: rgb(offFill),
      on: dim(rgb(onFill), light),
      rise: rise.level,
      riseGoal,
      cover: rise.level > 0 || riseGoal > 0,
      // The glow fades in as the effect takes over from the Switch's flat
      // fill, so that nothing jumps.
      glow: { color: dim(restGlow, light), strength: 1 - plain },
      backdrop: rgb(backdrop),
    },
  };
}

/** The bind group of `buffers`, made again when one of them is replaced. */
function createBinding(
  device: GPUDevice,
  layout: GPUBindGroupLayout,
  buffers: readonly { readonly buffer: GPUBuffer }[],
) {
  let bound: readonly GPUBuffer[] = [];
  let bindGroup: GPUBindGroup | null = null;
  return () => {
    const current = buffers.map(({ buffer }) => buffer);
    if (
      bindGroup === null ||
      current.some((buffer, index) => buffer !== bound[index])
    ) {
      bound = current;
      bindGroup = device.createBindGroup({
        layout,
        entries: current.map((buffer, binding) => ({
          binding,
          resource: { buffer },
        })),
      });
    }
    return bindGroup;
  };
}

/**
 * Liquid: draws the thumb of each Switch with the role as a body of liquid
 * on the track, in the colour and at the size of the thumb the Switch draws
 * itself, and covers the track with the fill that rises or sinks under it,
 * as `useLiquid` describes. It marks the Switch with `markEffectDrawn` while
 * it draws, so the Switch hides its own thumb only then. It asks for frames
 * only while something moves.
 *
 * @internal
 */
export const liquidEffect: Effect = {
  async setup({ device, format, pageLayout, targetLayout, requestFrame }) {
    const liquidLayout = device.createBindGroupLayout({
      entries: [0, 1, 2].map((binding) => ({
        binding,
        visibility: GPU_SHADER_STAGE.VERTEX | GPU_SHADER_STAGE.FRAGMENT,
        buffer: { type: "read-only-storage" as const },
      })),
    });
    const ringLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPU_SHADER_STAGE.VERTEX | GPU_SHADER_STAGE.FRAGMENT,
          buffer: { type: "read-only-storage" },
        },
      ],
    });
    const liquidModule = device.createShaderModule({ code: LIQUID_WGSL });
    const ringModule = device.createShaderModule({ code: RING_LIGHT_WGSL });
    // A ring starts only after a toggle lands, so the liquid does not wait
    // for the ring's pipeline, and a ring has no draw until it is ready.
    let ringPipeline: GPURenderPipeline | null = null;
    device
      .createRenderPipelineAsync({
        layout: device.createPipelineLayout({
          bindGroupLayouts: [pageLayout, targetLayout, ringLayout],
        }),
        vertex: { module: ringModule, entryPoint: "ringLightVertex" },
        fragment: {
          module: ringModule,
          entryPoint: "ringLightFragment",
          targets: [{ format, blend: PREMULTIPLIED_BLEND }],
        },
        primitive: { topology: "triangle-strip" },
      })
      .then(
        (pipeline) => {
          ringPipeline = pipeline;
        },
        (error: unknown) => {
          reportError(error);
        },
      );
    const liquidPipeline = await device.createRenderPipelineAsync({
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
    });

    const instanceBuffer = createPackedBuffer(
      device,
      LIQUID_INSTANCE_BYTES,
      packLiquidInstances,
    );
    const particleBuffer = createPackedBuffer(
      device,
      PARTICLE_BYTES,
      packLiquidParticles,
    );
    const beadBuffer = createPackedBuffer(device, BEAD_BYTES, packLiquidBeads);
    const ringBuffer = createPackedBuffer(
      device,
      RING_LIGHT_INSTANCE_BYTES,
      packRingLightInstances,
    );
    const liquidBinding = createBinding(device, liquidLayout, [
      instanceBuffer,
      particleBuffer,
      beadBuffer,
    ]);
    const ringBinding = createBinding(device, ringLayout, [ringBuffer]);

    const states = new Map<number, LiquidState>();
    const drawn = new Set<Element>();
    let instances: readonly LiquidInstance[] = [];
    let rings: readonly RingLightInstance[] = [];
    let endTimer: ReturnType<typeof setTimeout> | undefined;
    let scheduledEnd: number | null = null;

    // Under reduced motion no frame follows on its own, so the frame that
    // takes a still glow away is asked for when it is due.
    function scheduleEnd(nextEnd: number | null, time: number) {
      if (nextEnd === scheduledEnd) {
        return;
      }
      clearTimeout(endTimer);
      scheduledEnd = nextEnd;
      if (nextEnd !== null) {
        endTimer = setTimeout(
          () => {
            scheduledEnd = null;
            requestFrame();
          },
          Math.max(0, (nextEnd - time) * 1000) + 16,
        );
      }
    }

    return {
      update(_encoder, frame) {
        const nextInstances: LiquidInstance[] = [];
        const nextRings: RingLightInstance[] = [];
        const particles: LiquidParticle[] = [];
        const beads: LiquidBeadInstance[] = [];
        const seen = new Set<Element>();
        const kept = new Set<number>();
        let animating = false;
        let nextEnd: number | null = null;
        for (const [index, record] of frame.elements.entries()) {
          if ((record.roles & LIQUID) === 0) {
            continue;
          }
          const laid = layoutLiquid(
            record,
            index,
            states.get(record.id),
            frame,
            particles,
            beads,
          );
          if (laid === null) {
            continue;
          }
          seen.add(record.element);
          kept.add(record.id);
          states.set(record.id, laid.state);
          nextInstances.push(laid.instance);
          animating ||= laid.animating;
          const { ring, ringFill, colors } = laid.state;
          if (ring === null) {
            continue;
          }
          const state = ringLightAt(
            ring,
            boxOf(record),
            frame.time,
            frame.reducedMotion,
          );
          if (state === null) {
            continue;
          }
          animating = true;
          if (frame.reducedMotion) {
            const end = ringLightEnd(ring, true);
            nextEnd = nextEnd === null ? end : Math.min(nextEnd, end);
          }
          nextRings.push({
            elementIndex: index,
            state,
            ...colors.ring(ringFill, frame.scopes[record.scopeIndex].backdrop),
          });
        }
        for (const id of states.keys()) {
          if (!kept.has(id)) {
            states.delete(id);
          }
        }
        for (const element of drawn) {
          if (!seen.has(element)) {
            drawn.delete(element);
            markEffectDrawn(element, false);
          }
        }
        scheduleEnd(nextEnd, frame.time);
        instances = nextInstances;
        rings = nextRings;
        instanceBuffer.write(nextInstances);
        particleBuffer.write(particles);
        beadBuffer.write(beads);
        ringBuffer.write(nextRings);
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
        const [firstRing, ringCount] = instanceRange(
          rings,
          target.firstElement,
          target.elementCount,
        );
        if (ringPipeline !== null && ringCount > 0) {
          pass.setPipeline(ringPipeline);
          pass.setBindGroup(2, ringBinding());
          pass.draw(4, ringCount, 0, firstRing);
        }
      },
      destroy() {
        clearTimeout(endTimer);
        for (const element of drawn) {
          markEffectDrawn(element, false);
        }
        drawn.clear();
        instanceBuffer.destroy();
        particleBuffer.destroy();
        beadBuffer.destroy();
        ringBuffer.destroy();
      },
    };
  },
};
