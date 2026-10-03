import {
  GPU_BUFFER_USAGE,
  GPU_SHADER_STAGE,
  PREMULTIPLIED_BLEND,
} from "./constants.ts";
import { DUST_ATTRIBUTES } from "./dust-attributes.ts";
import { dustColor, isDarkBackground, packColor } from "./dust-color.ts";
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
import { readFill } from "./read-element-box.ts";
import {
  createLiveSlots,
  DUST_MAX_SPAWNS_PER_FRAME,
  DUST_PARTICLE_BUDGET,
  emissionRate,
  isShedding,
  scheduleDustSpawns,
  type DustEmitter,
  type DustFan,
  type LiveSlots,
} from "./schedule-dust-spawns.ts";
import type { Effect, EffectElementRecord } from "./types.ts";

const DUST = roleBits(["dust"]);
const EXTRACTOR_FAN = roleBits(["extractorFan"]);
const MIN_ELEMENT_CAPACITY = 16;
const QUAD_VERTICES = 6;
const PARTICLE_OPACITY = { light: 0.9, dark: 1 } as const;

// Screen: dense dust brightens towards white on a dark page and never past it.
const SCREEN: GPUBlendState = {
  color: { srcFactor: "one", dstFactor: "one-minus-src" },
  alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha" },
};

/** The value a wrapper of the element put on it, or the fallback. */
function readAttribute(
  element: Element,
  { name, fallback }: { name: string; fallback: number },
) {
  const value = Number(
    element.parentElement?.closest(`[${name}]`)?.getAttribute(name),
  );
  return Number.isFinite(value) ? Math.max(0, value) : fallback;
}

/** Whether the page behind the effect layer is dark. */
function isPageDark() {
  const background = readFill(
    getComputedStyle(document.documentElement).backgroundColor,
  );
  if (background[3] < 0.5) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return isDarkBackground(background);
}

/**
 * Dust and Extractor fan: elements with the dust role shed particles in
 * their fill colour that float off their edge, and elements with the
 * extractor fan role pull them in. The particles live once, on the GPU, in
 * page coordinates, so they cross band edges and draw on whichever scroll
 * `<canvas>` element they are over. While no element that sheds dust is near
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
    let dark = isPageDark();
    const drawPipelines = new Map<string, GPURenderPipeline | null>();
    /**
     * The pipeline that draws particles or motes for a light or a dark page,
     * or `null` while it compiles; a frame follows once it is ready. A page
     * needs one or two of the four, so the others never compile.
     */
    function drawPipeline(vertex: "particleVertex" | "moteVertex") {
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
    // Start to compile the drawing while the simulation compiles.
    drawPipeline("particleVertex");
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
     * that shed dust and the ones that pull it in.
     */
    function writeElements(records: readonly EffectElementRecord[]) {
      const buffer = ensureElementCapacity(records.length);
      const opacity = dark ? PARTICLE_OPACITY.dark : PARTICLE_OPACITY.light;
      const emitters: DustEmitter[] = [];
      const fans: DustFan[] = [];
      for (const [index, record] of records.entries()) {
        const { id, x, y, width, height, element } = record;
        let color = 0;
        let reach = 0;
        if ((record.roles & DUST) !== 0) {
          color = packColor([...dustColor(record.fill, dark), opacity]);
          const density = readAttribute(element, DUST_ATTRIBUTES.density);
          emitters.push({ id, index, x, y, width, height, density });
        }
        if ((record.roles & EXTRACTOR_FAN) !== 0) {
          reach = readAttribute(element, DUST_ATTRIBUTES.reach);
          fans.push({ id, x, y, width, height, reach });
        }
        elementWords[index * 2] = color;
        elementFloats[index * 2 + 1] = reach;
      }
      device.queue.writeBuffer(buffer, 0, elementWords, 0, records.length * 2);
      return { emitters, fans };
    }

    const carried = new Map<number, number>();
    let frameCount = 0;

    return {
      update(encoder, frame) {
        dark = isPageDark();
        const { emitters, fans } = writeElements(frame.elements);
        if (frame.reducedMotion) {
          carried.clear();
          liveSlots.clear();
          return false;
        }

        const shedding = emitters.filter((emitter) =>
          isShedding(emitter, fans, frame.viewport),
        );
        const rates = shedding.map((emitter) =>
          emissionRate(emitter, fans, frame.pointer),
        );
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
          const pipeline = drawPipeline("moteVertex");
          if (pipeline !== null && target.elementCount > 0) {
            pass.setPipeline(pipeline);
            pass.setBindGroup(2, renderGroup);
            pass.draw(
              QUAD_VERTICES * target.elementCount * DUST_MOTES_PER_ELEMENT,
              1,
              QUAD_VERTICES * target.firstElement * DUST_MOTES_PER_ELEMENT,
            );
          }
          return;
        }
        // Particles live in the page, so they draw on the bands. Only a page
        // with no band draws them on the fixed <canvas> element.
        const pipeline = drawPipeline("particleVertex");
        if (
          pipeline === null ||
          live.length === 0 ||
          (target.band === null &&
            frame.targets.some((other) => other.band !== null))
        ) {
          return;
        }
        pass.setPipeline(pipeline);
        pass.setBindGroup(2, renderGroup);
        const beforeWrap = Math.min(
          live.length,
          DUST_PARTICLE_BUDGET - live.start,
        );
        pass.draw(QUAD_VERTICES * beforeWrap, 1, QUAD_VERTICES * live.start);
        if (live.length > beforeWrap) {
          pass.draw(QUAD_VERTICES * (live.length - beforeWrap));
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
