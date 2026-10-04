import {
  GPU_BUFFER_USAGE,
  GPU_SHADER_STAGE,
  PREMULTIPLIED_BLEND,
} from "./constants.ts";
import { dustColor, packColor } from "./dust-color.ts";
import {
  DUST_COMPUTE_WGSL,
  DUST_SIMULATION_BYTES,
  DUST_WORKGROUP_SIZE,
} from "./dust-compute-wgsl.ts";
import {
  DUST_MOTES_PER_ELEMENT,
  DUST_RENDER_WGSL,
} from "./dust-render-wgsl.ts";
import { DUST_ELEMENT_BYTES, DUST_PARTICLE_BYTES } from "./dust-shared-wgsl.ts";
import { roleBits } from "./effect-roles.ts";
import {
  EFFECT_SETTING_DEFAULTS,
  finiteOr,
} from "./effect-setting-defaults.ts";
import {
  createLiveSlots,
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
import type { Effect, EffectFrame } from "./types.ts";

const DUST = roleBits(["dust"]);
const EXTRACTOR_FAN = roleBits(["extractorFan"]);
const MIN_ELEMENT_CAPACITY = 16;
const ELEMENT_WORDS = DUST_ELEMENT_BYTES / 4;
const QUAD_VERTICES = 6;
const PARTICLE_OPACITY = { light: 0.9, dark: 1 } as const;

// Screen: dense dust brightens towards white on a dark page and never past it.
const SCREEN: GPUBlendState = {
  color: { srcFactor: "one", dstFactor: "one-minus-src" },
  alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha" },
};

/** The elements of one scope that shed dust and the ones that pull it in. */
interface ScopeDust {
  readonly dark: boolean;
  readonly emitters: DustEmitter[];
  readonly fans: DustFan[];
}

/**
 * Dust and Extractor fan: elements with the dust role shed particles in
 * their fill colour that float off their edge, and elements with the
 * extractor fan role pull them in. The particles live once, on the GPU, in
 * page coordinates, so they cross band edges and draw on whichever scroll
 * `<canvas>` element they are over. Each particle keeps the scope of the
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
  async setup({ device, format, pageLayout, targetLayout, requestFrame }) {
    const computeLayout = device.createBindGroupLayout({
      entries: (
        [
          "uniform",
          "storage",
          "read-only-storage",
          "read-only-storage",
        ] as const
      ).map((type, binding) => ({
        binding,
        visibility: GPU_SHADER_STAGE.COMPUTE,
        buffer: { type },
      })),
    });
    const renderLayout = device.createBindGroupLayout({
      entries: [0, 1].map((binding) => ({
        binding,
        visibility: GPU_SHADER_STAGE.VERTEX,
        buffer: { type: "read-only-storage" as const },
      })),
    });
    const computeModule = device.createShaderModule({
      code: DUST_COMPUTE_WGSL,
    });
    const renderModule = device.createShaderModule({ code: DUST_RENDER_WGSL });
    const pipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [pageLayout, targetLayout, renderLayout],
    });
    const liveSlots = createLiveSlots();
    let live: LiveSlots = { start: 0, length: 0 };
    /** Seconds the simulation has run. */
    let simulated = 0;
    /**
     * When an element last shed dust over a light backdrop, and over a dark
     * one, on the simulation's clock.
     */
    const lastShed = new Map<boolean, number>();
    /** Whether the motes of this frame draw over a light backdrop, a dark one. */
    const moteDarkness = new Set<boolean>();
    const drawPipelines = new Map<string, GPURenderPipeline | null>();
    /**
     * The pipeline that draws particles or motes over a light or a dark
     * backdrop, or `null` while it compiles; a frame follows once it is
     * ready. A page needs one or two of the four, so the others never
     * compile.
     */
    function drawPipeline(
      vertex: "particleVertex" | "moteVertex",
      dark: boolean,
    ) {
      const key = `${vertex} ${dark ? "dark" : "light"}`;
      if (!drawPipelines.has(key)) {
        drawPipelines.set(key, null);
        device
          .createRenderPipelineAsync({
            layout: pipelineLayout,
            vertex: { module: renderModule, entryPoint: vertex },
            fragment: {
              module: renderModule,
              entryPoint: "fragmentMain",
              targets: [{ format, blend: dark ? SCREEN : PREMULTIPLIED_BLEND }],
            },
            primitive: { topology: "triangle-list" },
          })
          .then(
            (pipeline) => {
              drawPipelines.set(key, pipeline);
              requestFrame();
            },
            (error: unknown) => {
              reportError(error);
            },
          );
      }
      return drawPipelines.get(key) ?? null;
    }
    const simulatePipeline = await device.createComputePipelineAsync({
      layout: device.createPipelineLayout({
        bindGroupLayouts: [pageLayout, computeLayout],
      }),
      compute: { module: computeModule, entryPoint: "simulate" },
    });

    const simulation = new Uint32Array(DUST_SIMULATION_BYTES / 4);
    const simulationBuffer = device.createBuffer({
      size: DUST_SIMULATION_BYTES,
      usage: GPU_BUFFER_USAGE.UNIFORM | GPU_BUFFER_USAGE.COPY_DST,
    });
    const particleBuffer = device.createBuffer({
      size: DUST_PARTICLE_BUDGET * DUST_PARTICLE_BYTES,
      usage: GPU_BUFFER_USAGE.STORAGE,
    });
    const spawnList = new Uint32Array(DUST_MAX_SPAWNS_PER_FRAME);
    const spawnBuffer = device.createBuffer({
      size: spawnList.byteLength,
      usage: GPU_BUFFER_USAGE.STORAGE | GPU_BUFFER_USAGE.COPY_DST,
    });

    let elementCapacity = 0;
    let elementWords = new Uint32Array(0);
    let elementFloats = new Float32Array(0);
    let elementBuffer: GPUBuffer | null = null;
    let computeGroup: GPUBindGroup | null = null;
    let renderGroup: GPUBindGroup | null = null;

    function ensureElementCapacity(count: number) {
      if (count <= elementCapacity && elementBuffer !== null) {
        return elementBuffer;
      }
      elementCapacity = Math.max(
        MIN_ELEMENT_CAPACITY,
        2 ** Math.ceil(Math.log2(count)),
      );
      elementBuffer?.destroy();
      const values = new ArrayBuffer(elementCapacity * DUST_ELEMENT_BYTES);
      elementWords = new Uint32Array(values);
      elementFloats = new Float32Array(values);
      elementBuffer = device.createBuffer({
        size: values.byteLength,
        usage: GPU_BUFFER_USAGE.STORAGE | GPU_BUFFER_USAGE.COPY_DST,
      });
      computeGroup = device.createBindGroup({
        layout: computeLayout,
        entries: [
          { binding: 0, resource: { buffer: simulationBuffer } },
          { binding: 1, resource: { buffer: particleBuffer } },
          { binding: 2, resource: { buffer: spawnBuffer } },
          { binding: 3, resource: { buffer: elementBuffer } },
        ],
      });
      renderGroup = device.createBindGroup({
        layout: renderLayout,
        entries: [
          { binding: 0, resource: { buffer: particleBuffer } },
          { binding: 1, resource: { buffer: elementBuffer } },
        ],
      });
      return elementBuffer;
    }

    /**
     * Writes each element's dust colour and reach, and returns the elements
     * of each scope that shed dust and the ones that pull it in.
     */
    function writeElements(frame: EffectFrame) {
      const records = frame.elements;
      const buffer = ensureElementCapacity(records.length);
      const scopes = frame.scopes.map(({ dark }): ScopeDust => ({
        dark,
        emitters: [],
        fans: [],
      }));
      moteDarkness.clear();
      for (const [index, record] of records.entries()) {
        const { id, x, y, width, height, settings } = record;
        const { dark, emitters, fans } = scopes[record.scopeIndex];
        let color = 0;
        let reach = 0;
        if ((record.roles & DUST) !== 0) {
          moteDarkness.add(dark);
          const opacity = dark ? PARTICLE_OPACITY.dark : PARTICLE_OPACITY.light;
          color = packColor([...dustColor(record.fill, dark), opacity]);
          const density = Math.max(
            0,
            finiteOr(
              settings.dust?.density,
              EFFECT_SETTING_DEFAULTS.dust.density,
            ),
          );
          emitters.push({ id, index, x, y, width, height, density });
        }
        if ((record.roles & EXTRACTOR_FAN) !== 0) {
          reach = Math.max(
            0,
            finiteOr(
              settings.extractorFan?.reach,
              EFFECT_SETTING_DEFAULTS.extractorFan.reach,
            ),
          );
          fans.push({ id, x, y, width, height, reach });
        }
        elementWords[index * ELEMENT_WORDS] = color;
        elementFloats[index * ELEMENT_WORDS + 1] = reach;
        elementWords[index * ELEMENT_WORDS + 2] = dark ? 1 : 0;
      }
      device.queue.writeBuffer(
        buffer,
        0,
        elementWords,
        0,
        records.length * ELEMENT_WORDS,
      );
      return scopes;
    }

    const carried = new Map<number, number>();
    let frameCount = 0;

    return {
      update(encoder, frame) {
        const scopes = writeElements(frame);
        if (frame.reducedMotion) {
          carried.clear();
          liveSlots.clear();
          lastShed.clear();
          return false;
        }

        simulated += frame.delta;
        const shedding: DustEmitter[] = [];
        const rates: number[] = [];
        for (const { dark, emitters, fans } of scopes) {
          for (const emitter of emitters) {
            if (isShedding(emitter, fans, frame.viewport)) {
              shedding.push(emitter);
              rates.push(emissionRate(emitter, fans, frame.pointer));
              lastShed.set(dark, simulated);
            }
          }
        }
        const spawns = scheduleDustSpawns(
          shedding,
          rates,
          frame.delta,
          carried,
        );
        live = liveSlots.advance(frame.delta, spawns.length);
        if (live.length === 0) {
          return rates.some((rate) => rate > 0);
        }

        if (spawns.length > 0) {
          spawnList.set(spawns);
          device.queue.writeBuffer(spawnBuffer, 0, spawnList, 0, spawns.length);
        }
        frameCount += 1;
        simulation.set([live.start, live.length, spawns.length, frameCount]);
        device.queue.writeBuffer(simulationBuffer, 0, simulation);

        const pass = encoder.beginComputePass();
        pass.setPipeline(simulatePipeline);
        pass.setBindGroup(0, frame.pageBindGroup);
        pass.setBindGroup(1, computeGroup);
        pass.dispatchWorkgroups(Math.ceil(live.length / DUST_WORKGROUP_SIZE));
        pass.end();
        return true;
      },
      draw(pass, target, frame) {
        if (frame.reducedMotion) {
          for (const dark of moteDarkness) {
            const pipeline = drawPipeline("moteVertex", dark);
            if (pipeline !== null && target.elementCount > 0) {
              pass.setPipeline(pipeline);
              pass.setBindGroup(2, renderGroup);
              pass.draw(
                QUAD_VERTICES * target.elementCount * DUST_MOTES_PER_ELEMENT,
                1,
                QUAD_VERTICES * target.firstElement * DUST_MOTES_PER_ELEMENT,
                dark ? 1 : 0,
              );
            }
          }
          return;
        }
        // Particles live in the page, so they draw on the bands. Only a page
        // with no band draws them on the fixed <canvas> element.
        if (
          live.length === 0 ||
          (target.band === null &&
            frame.targets.some((other) => other.band !== null))
        ) {
          return;
        }
        for (const [dark, shedAt] of lastShed) {
          const pipeline = drawPipeline("particleVertex", dark);
          if (pipeline === null || simulated - shedAt >= DUST_MAX_LIFE) {
            continue;
          }
          const instance = dark ? 1 : 0;
          pass.setPipeline(pipeline);
          pass.setBindGroup(2, renderGroup);
          const beforeWrap = Math.min(
            live.length,
            DUST_PARTICLE_BUDGET - live.start,
          );
          pass.draw(
            QUAD_VERTICES * beforeWrap,
            1,
            QUAD_VERTICES * live.start,
            instance,
          );
          if (live.length > beforeWrap) {
            pass.draw(
              QUAD_VERTICES * (live.length - beforeWrap),
              1,
              0,
              instance,
            );
          }
        }
      },
      destroy() {
        simulationBuffer.destroy();
        particleBuffer.destroy();
        spawnBuffer.destroy();
        elementBuffer?.destroy();
      },
    };
  },
};
