import { dustMotesWgsl } from "../_generated/wgsl/dust-motes.ts";
import { dustParticlesWgsl } from "../_generated/wgsl/dust-particles.ts";
import { dustSimulationWgsl } from "../_generated/wgsl/dust-simulation.ts";
import {
  DustElement,
  dustLayout,
  DustParticle,
  DustSimulation,
  dustSimulationLayout,
  DustSpawn,
} from "../_generated/wgsl/layouts.ts";
import { compileEffectShader } from "./compile-effect-shader.ts";
import { createBinding } from "./create-binding.ts";
import { createPackedBuffer } from "./create-packed-buffer.ts";
import { createStorageBuffer } from "./create-storage-buffer.ts";
import { createUniformBuffer } from "./create-uniform-buffer.ts";
import {
  DUST,
  DUST_MOTES_PER_ELEMENT,
  DUST_QUAD_VERTICES,
  DUST_WORKGROUP_SIZE,
  dustElementValue,
  EXTRACTOR_FAN,
} from "./dust-element-value.ts";
import type { DustElement as DustElementSchema } from "./dust-layout.ts";
import {
  EFFECT_SETTING_DEFAULTS,
  finiteOr,
} from "./effect-setting-defaults.ts";
import { type CarrierKey, isViewportCarrier } from "./resolve-carrier.ts";
import {
  createDustBursts,
  createLiveSlots,
  DUST_BURST_SPAWN,
  DUST_MAX_LIFE,
  DUST_MAX_SPAWNS_PER_FRAME,
  DUST_PARTICLE_BUDGET,
  emissionRate,
  isShedding,
  scheduleDustSpawns,
  type DustEmitter,
  type DustFan,
  type LiveSlots,
} from "./schedule-dust-spawns.ts";
import { dispatch } from "./set-bind-group.ts";
import type { Effect, EffectFrame, EffectInput } from "./types.ts";

// Screen: dense dust brightens towards white on a dark page and never past it.
const SCREEN: GPUBlendState = {
  color: { srcFactor: "one", dstFactor: "one-minus-src" },
  alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha" },
};

/**
 * An element that sheds dust, whether its scope draws over a dark backdrop,
 * and whether its dust stays on the viewport.
 */
interface ScopeEmitter extends DustEmitter {
  readonly dark: boolean;
  readonly onViewport: boolean;
}

/** The particle instance bit of the dust that stays on the viewport. */
const ON_VIEWPORT_INSTANCE = 2;
const HOLDS_VIEWPORT: readonly CarrierKey[] = ["fixed"];

/** The elements of one scope that shed dust and the ones that pull it in. */
interface ScopeDust {
  readonly dark: boolean;
  readonly emitters: ScopeEmitter[];
  readonly fans: DustFan[];
}

/**
 * The first instance of a particle draw: bit 0 picks the dust that draws over
 * a dark backdrop, and bit 1 the dust that stays on the viewport.
 */
const particleInstance = (dark: boolean, onViewport: boolean) =>
  (dark ? 1 : 0) + (onViewport ? ON_VIEWPORT_INSTANCE : 0);

/**
 * The target that draws the dust that stays on the viewport: the viewport's
 * `<canvas>` element from its top edge, or else from its bottom edge.
 */
function viewportTargetOf(frame: EffectFrame) {
  const on = (key: string) =>
    frame.targets.find(({ carrier }) => frame.carriers[carrier] === key);
  return on("fixed") ?? on("fixedBottom");
}

/**
 * Dust and Extractor fan: elements with the dust role shed particles in
 * their fill colour that float off their edge, and elements with the
 * extractor fan role pull them in. The particles live once, on the GPU, in
 * page coordinates, so they cross band edges and draw on whichever scroll
 * `<canvas>` element they are over. The particles of an element on the
 * viewport, or of one whose dust is on the viewport, live in viewport
 * coordinates instead, so they keep their place on the screen while the page
 * scrolls, and draw on the viewport's `<canvas>` element, which the effect
 * holds while they can live, also after the element has gone. A click on an
 * element sheds its burst in one go, fast and short lived, and the fans pull
 * those particles at once. Each particle keeps the scope of the
 * element that shed it: only the fans and obstacles of that scope act on it,
 * it draws only inside its Effect container, and it dies once it leaves the
 * container's box. While no element that sheds dust is near
 * the viewport and the last particle has died, it asks for no frame and
 * draws nothing. Under reduced motion nothing moves: still motes sit around
 * each element that sheds dust.
 *
 * @internal
 */
export const dustEffect: Effect = {
  async setup({ device, colorTarget, requestFrame }) {
    const liveSlots = createLiveSlots();
    let live: LiveSlots = { start: 0, length: 0 };
    /** Seconds the simulation has run. */
    let simulated = 0;
    /**
     * When an element last shed dust of each `particleInstance`, on the
     * simulation's clock.
     */
    const lastShed = new Map<number, number>();
    const bursts = createDustBursts();
    /** Whether the motes of this frame draw over a light backdrop, a dark one. */
    const moteDarkness = new Set<boolean>();
    const triangles: GPUPrimitiveState = { topology: "triangle-list" };
    const shaders = {
      particleVertex: compileEffectShader(device, dustParticlesWgsl),
      moteVertex: compileEffectShader(device, dustMotesWgsl),
    };
    const drawPipelines = new Map<string, GPURenderPipeline | null>();
    /**
     * The pipeline that draws particles or motes over a light or a dark
     * backdrop, or `null` while it compiles; a frame follows once it is
     * ready. It compiles in a task of its own, out of the frame. The
     * particle pipelines start to compile at setup, so that the first
     * particles of a burst draw in the frame that sheds them. The mote
     * pipelines compile only when reduced motion needs them.
     */
    function drawPipeline(
      vertex: "particleVertex" | "moteVertex",
      dark: boolean,
    ) {
      const key = `${vertex} ${dark ? "dark" : "light"}`;
      if (!drawPipelines.has(key)) {
        drawPipelines.set(key, null);
        const target = dark ? { ...colorTarget, blend: SCREEN } : colorTarget;
        setTimeout(() => {
          shaders[vertex].render(target, triangles).then(
            (pipeline) => {
              drawPipelines.set(key, pipeline);
              requestFrame();
            },
            (error: unknown) => {
              reportError(error);
            },
          );
        });
      }
      return drawPipelines.get(key) ?? null;
    }
    drawPipeline("particleVertex", false);
    drawPipeline("particleVertex", true);
    const simulate = await compileEffectShader(
      device,
      dustSimulationWgsl,
    ).compute();

    const simulationBuffer = createUniformBuffer(device, DustSimulation);
    const particleBuffer = createStorageBuffer(
      device,
      DustParticle,
      DUST_PARTICLE_BUDGET,
    );
    const spawnBuffer = createStorageBuffer(
      device,
      DustSpawn,
      DUST_MAX_SPAWNS_PER_FRAME,
    );
    const elementBuffer = createPackedBuffer(device, DustElement);
    const simulationBinding = createBinding(
      device,
      dustSimulationLayout,
      () => ({
        simulation: simulationBuffer,
        particles: particleBuffer,
        spawns: spawnBuffer,
        dustElements: elementBuffer.buffer,
      }),
    );
    const drawBinding = createBinding(device, dustLayout, () => ({
      particles: particleBuffer,
      dustElements: elementBuffer.buffer,
    }));

    /**
     * Writes each element's dust colour and reach, and returns the elements
     * of each scope that shed dust and the ones that pull it in.
     */
    function writeElements(frame: EffectFrame) {
      const scopes = frame.scopes.map(({ dark }): ScopeDust => ({
        dark,
        emitters: [],
        fans: [],
      }));
      moteDarkness.clear();
      const values: EffectInput<typeof DustElementSchema>[] = [];
      for (const [index, record] of frame.elements.entries()) {
        const { id, x, y, width, height, roles, settings } = record;
        const { dark, emitters, fans } = scopes[record.scopeIndex];
        let colored = false;
        let onViewport = false;
        if ((roles & DUST) !== 0) {
          const density = Math.max(
            0,
            finiteOr(
              settings.dust?.density,
              EFFECT_SETTING_DEFAULTS.dust.density,
            ),
          );
          const burst = Math.max(
            0,
            finiteOr(settings.dust?.burst, EFFECT_SETTING_DEFAULTS.dust.burst),
          );
          // Under reduced motion, an element that sheds only bursts shows
          // no motes, so its dust has no colour.
          colored = !frame.reducedMotion || density > 0;
          if (colored) {
            moteDarkness.add(dark);
          }
          onViewport =
            isViewportCarrier(record.carrier) ||
            settings.dust?.carrier === "viewport";
          emitters.push({
            id,
            index,
            x,
            y,
            width,
            height,
            density,
            burst,
            shakes:
              record.clicks +
              Math.max(
                0,
                Math.floor(
                  finiteOr(
                    settings.dust?.shakes,
                    EFFECT_SETTING_DEFAULTS.dust.shakes,
                  ),
                ),
              ),
            dark,
            onViewport,
          });
        }
        const value = dustElementValue(record, dark, colored, onViewport);
        values.push(value);
        if ((roles & EXTRACTOR_FAN) !== 0) {
          fans.push({ id, x, y, width, height, reach: value.reach });
        }
      }
      elementBuffer.write(values);
      return scopes;
    }

    const carried = new Map<number, number>();
    let frameCount = 0;

    return {
      update(encoder, frame) {
        const scopes = writeElements(frame);
        const allEmitters = scopes.flatMap(({ emitters }) => emitters);
        if (frame.reducedMotion) {
          bursts.take(allEmitters, 0, false);
          carried.clear();
          liveSlots.clear();
          lastShed.clear();
          return false;
        }

        simulated += frame.delta;
        const shedding: DustEmitter[] = [];
        const rates: number[] = [];
        for (const { emitters, fans } of scopes) {
          for (const emitter of emitters) {
            if (isShedding(emitter, fans, frame.viewport)) {
              shedding.push(emitter);
              rates.push(emissionRate(emitter, fans, frame.pointer));
            }
          }
        }
        const spawns = scheduleDustSpawns(
          shedding,
          rates,
          frame.delta,
          carried,
        );
        spawns.push(
          ...bursts.take(
            allEmitters,
            DUST_MAX_SPAWNS_PER_FRAME - spawns.length,
            true,
          ),
        );
        if (spawns.length > 0) {
          const shedNow = new Set(
            spawns.map((spawn) => spawn % DUST_BURST_SPAWN),
          );
          for (const { index, dark, onViewport } of allEmitters) {
            if (shedNow.has(index)) {
              lastShed.set(particleInstance(dark, onViewport), simulated);
            }
          }
        }
        live = liveSlots.advance(frame.delta, spawns.length);
        if (live.length === 0) {
          return rates.some((rate) => rate > 0);
        }

        if (spawns.length > 0) {
          spawnBuffer.write(spawns);
        }
        frameCount += 1;
        simulationBuffer.write({
          firstSlot: live.start,
          liveCount: live.length,
          bornCount: spawns.length,
          frame: frameCount,
        });

        dispatch(
          encoder,
          simulate,
          [frame.pageBindGroup, simulationBinding()],
          Math.ceil(live.length / DUST_WORKGROUP_SIZE),
        );
        return true;
      },
      draw(pass, target, frame) {
        if (frame.reducedMotion) {
          for (const dark of moteDarkness) {
            const pipeline = drawPipeline("moteVertex", dark);
            if (pipeline !== null) {
              pass.draw(
                pipeline,
                drawBinding(),
                DUST_QUAD_VERTICES *
                  target.elementCount *
                  DUST_MOTES_PER_ELEMENT,
                1,
                DUST_QUAD_VERTICES *
                  target.firstElement *
                  DUST_MOTES_PER_ELEMENT,
                dark ? 1 : 0,
              );
            }
          }
          return;
        }
        if (live.length === 0) {
          return;
        }
        // Particles of the page draw on the bands, and a frame with no band
        // draws them on its first <canvas> element. Particles of the
        // viewport draw on the viewport's <canvas> element.
        const hasBands = frame.targets.some(({ band }) => band !== null);
        const drawsPage =
          target.band !== null || (!hasBands && target === frame.targets[0]);
        const drawsViewport = target === viewportTargetOf(frame);
        for (const [instance, shedAt] of lastShed) {
          const onViewport = (instance & ON_VIEWPORT_INSTANCE) !== 0;
          const pipeline = drawPipeline("particleVertex", (instance & 1) !== 0);
          if (
            (onViewport ? !drawsViewport : !drawsPage) ||
            pipeline === null ||
            simulated - shedAt >= DUST_MAX_LIFE
          ) {
            continue;
          }
          const group = drawBinding();
          const beforeWrap = Math.min(
            live.length,
            DUST_PARTICLE_BUDGET - live.start,
          );
          pass.draw(
            pipeline,
            group,
            DUST_QUAD_VERTICES * beforeWrap,
            1,
            DUST_QUAD_VERTICES * live.start,
            instance,
          );
          pass.draw(
            pipeline,
            group,
            DUST_QUAD_VERTICES * (live.length - beforeWrap),
            1,
            0,
            instance,
          );
        }
      },
      holds() {
        for (const [instance, shedAt] of lastShed) {
          if (
            (instance & ON_VIEWPORT_INSTANCE) !== 0 &&
            simulated - shedAt < DUST_MAX_LIFE
          ) {
            return HOLDS_VIEWPORT;
          }
        }
        return [];
      },
      destroy() {
        simulationBuffer.destroy();
        particleBuffer.destroy();
        spawnBuffer.destroy();
        elementBuffer.destroy();
      },
    };
  },
};
