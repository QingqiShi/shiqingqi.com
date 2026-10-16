import {
  GPU_BUFFER_USAGE,
  GPU_SHADER_STAGE,
} from "../effect-layer/constants.ts";
import { readEffectLayerMode } from "../effect-layer/read-effect-layer-mode.ts";
import { INK_DIM_WGSL } from "./ink-dim-wgsl.ts";

/**
 * The dials of the ink dim, in ms and CSS px. The ink fills the screen in
 * `openMs` and clears in `closeMs`. It leaves the card's edge at
 * `speed` px/s while the edge gives out ink for the first `emitShare` of
 * the open, and from `fillFrom` of the open the gaps fill in, so the ink
 * ends as the plain dim. `cellPx` is the smallest grid cell.
 *
 * @internal
 */
export const INK_DIM_TIMING = {
  openMs: 560,
  closeMs: 520,
  speed: 900,
  emitShare: 0.65,
  fillFrom: 0.4,
  vorticity: 60,
  swirl: 520,
  source: 70,
  core: 0.18,
  cellPx: 5,
  gridCells: 150,
  displayScale: 0.5,
} as const;

interface Gpu {
  readonly device: GPUDevice;
  readonly format: GPUTextureFormat;
  readonly layout: GPUBindGroupLayout;
  readonly sampler: GPUSampler;
  readonly uniforms: GPUBuffer;
  readonly pipes: Record<string, GPURenderPipeline>;
}

interface Field {
  tex: GPUTexture;
  view: GPUTextureView;
}

interface Run {
  readonly mode: "open" | "close";
  readonly start: number;
  readonly duration: number;
  readonly card: HTMLElement;
  readonly from: number;
  readonly level: () => number;
  readonly onDone: () => void;
  last: number;
  prev: DOMRect | null;
  isFresh: boolean;
}

/**
 * What starts a run of the ink.
 *
 * @internal
 */
export interface InkRunOptions {
  readonly card: HTMLElement;
  /** The dim, whose colour the ink takes. */
  readonly dim: HTMLElement;
  /** The dim's opacity when the close starts. */
  readonly from?: number;
  /** How much of the dim shows now, 0 to 1, read on each frame. */
  readonly level?: () => number;
  readonly onDone: () => void;
}

const SIM_FORMAT: GPUTextureFormat = "rgba16float";
const SIM_PASSES = [
  "fsCurl",
  "fsForces",
  "fsDiv",
  "fsPressure",
  "fsGrad",
  "fsAdvectVel",
  "fsAdvectDye",
  "fsInitDye",
  "fsInitVel",
];
const PRESSURE_STEPS = 18;
// TEXTURE_BINDING | RENDER_ATTACHMENT, from the WebGPU specification.
const TEXTURE_USAGE = 0x04 | 0x10;

let gpuPromise: Promise<Gpu | null> | null = null;

async function requestGpu(): Promise<Gpu | null> {
  if (!("gpu" in navigator)) return null;
  try {
    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: "low-power",
    });
    if (!adapter) return null;
    const device = await adapter.requestDevice();
    const format = navigator.gpu.getPreferredCanvasFormat();
    const module = device.createShaderModule({ code: INK_DIM_WGSL });
    const layout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPU_SHADER_STAGE.FRAGMENT,
          buffer: { type: "uniform" },
        },
        { binding: 1, visibility: GPU_SHADER_STAGE.FRAGMENT, texture: {} },
        { binding: 2, visibility: GPU_SHADER_STAGE.FRAGMENT, texture: {} },
        { binding: 3, visibility: GPU_SHADER_STAGE.FRAGMENT, sampler: {} },
      ],
    });
    const pipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [layout],
    });
    const pipe = (entryPoint: string, target: GPUTextureFormat) =>
      device.createRenderPipeline({
        layout: pipelineLayout,
        vertex: { module, entryPoint: "vs" },
        fragment: { module, entryPoint, targets: [{ format: target }] },
        primitive: { topology: "triangle-list" },
      });
    const pipes: Record<string, GPURenderPipeline> = {};
    for (const name of SIM_PASSES) pipes[name] = pipe(name, SIM_FORMAT);
    pipes.fsDisplay = pipe("fsDisplay", format);
    return {
      device,
      format,
      layout,
      sampler: device.createSampler({
        magFilter: "linear",
        minFilter: "linear",
      }),
      uniforms: device.createBuffer({
        size: 7 * 16,
        usage: GPU_BUFFER_USAGE.UNIFORM | GPU_BUFFER_USAGE.COPY_DST,
      }),
      pipes,
    };
  } catch {
    return null;
  }
}

function parseColor(value: string): [number, number, number, number] {
  const numbers = value.match(/[\d.]+/g)?.map(Number) ?? [];
  const [r = 0, g = 0, b = 0, a = 1] = numbers;
  return [r / 255, g / 255, b / 255, a];
}

/**
 * Drives the Sheet's ink dim on a `<canvas>` element over the visible
 * area: on open, ink comes out of the card's edge and spreads until it is
 * the plain dim; on close, the dim breaks up and swirls away.
 *
 * @internal
 */
export function createInkDim() {
  let gpu: Gpu | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let context: GPUCanvasContext | null = null;
  let run: Run | null = null;
  let frame = 0;
  let grid: [number, number] = [0, 0];
  let fields: Record<string, [Field, Field]> | null = null;
  const tint: [number, number, number, number] = [0, 0, 0, 0.32];

  function warm() {
    gpuPromise ??= requestGpu();
    void gpuPromise.then((ready) => {
      gpu = ready;
      configure();
    });
  }

  function configure() {
    if (!gpu || !canvas || context) return;
    const next = canvas.getContext("webgpu");
    if (!(next instanceof GPUCanvasContext)) return;
    context = next;
    context.configure({
      device: gpu.device,
      format: gpu.format,
      alphaMode: "premultiplied",
    });
  }

  // React detaches and attaches the ref again in development, so a
  // detach keeps the run, and the same element keeps its context.
  function attach(element: HTMLCanvasElement | null) {
    if (element === null || element === canvas) return;
    stop();
    canvas = element;
    context = null;
    configure();
  }

  function canRun() {
    return (
      gpu !== null &&
      context !== null &&
      readEffectLayerMode() !== "off" &&
      !window.matchMedia("(forced-colors: active)").matches
    );
  }

  function field(device: GPUDevice, w: number, h: number): Field {
    const tex = device.createTexture({
      size: [w, h],
      format: SIM_FORMAT,
      usage: TEXTURE_USAGE,
    });
    return { tex, view: tex.createView() };
  }

  function ensureFields(w: number, h: number) {
    if (!gpu) return;
    if (fields && grid[0] === w && grid[1] === h) return;
    if (fields) {
      for (const pair of Object.values(fields)) {
        for (const item of pair) item.tex.destroy();
      }
    }
    const { device } = gpu;
    grid = [w, h];
    fields = {
      vel: [field(device, w, h), field(device, w, h)],
      dye: [field(device, w, h), field(device, w, h)],
      press: [field(device, w, h), field(device, w, h)],
      curl: [field(device, w, h), field(device, w, h)],
      div: [field(device, w, h), field(device, w, h)],
    };
  }

  function start(mode: "open" | "close", options: InkRunOptions) {
    if (!canvas || !canRun()) {
      options.onDone();
      return;
    }
    stop();
    const color = parseColor(getComputedStyle(options.dim).backgroundColor);
    tint.splice(0, 4, ...color);
    run = {
      mode,
      start: performance.now(),
      duration:
        mode === "open" ? INK_DIM_TIMING.openMs : INK_DIM_TIMING.closeMs,
      card: options.card,
      from: options.from ?? 1,
      level: options.level ?? (() => 1),
      onDone: options.onDone,
      last: performance.now(),
      prev: null,
      isFresh: true,
    };
    canvas.style.visibility = "visible";
    frame = requestAnimationFrame(tick);
  }

  function stop() {
    if (frame !== 0) cancelAnimationFrame(frame);
    frame = 0;
    run = null;
    if (canvas) canvas.style.visibility = "hidden";
  }

  function tick(now: number) {
    frame = 0;
    const current = run;
    if (!current) return;
    const progress = Math.min((now - current.start) / current.duration, 1);
    if (progress >= 1 || !gpu || !context || !canvas?.isConnected) {
      stop();
      current.onDone();
      return;
    }
    const dt = Math.min(Math.max((now - current.last) / 1000, 1 / 240), 1 / 30);
    current.last = now;
    const box = canvas.getBoundingClientRect();
    if (box.width < 1 || box.height < 1) {
      frame = requestAnimationFrame(tick);
      return;
    }
    const cell = Math.max(
      INK_DIM_TIMING.cellPx,
      Math.max(box.width, box.height) / INK_DIM_TIMING.gridCells,
    );
    const w = Math.ceil(box.width / cell);
    const h = Math.ceil(box.height / cell);
    ensureFields(w, h);
    const scale = INK_DIM_TIMING.displayScale;
    const cw = Math.max(1, Math.round(box.width * scale));
    const ch = Math.max(1, Math.round(box.height * scale));
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }

    const rect = current.card.getBoundingClientRect();
    const prev = current.prev ?? rect;
    current.prev = rect;
    const radius =
      Number.parseFloat(getComputedStyle(current.card).borderTopLeftRadius) ||
      0;
    const t = progress;
    const isOpen = current.mode === "open";
    const emit = isOpen ? 1 - smoothstep(0, INK_DIM_TIMING.emitShare, t) : 0;
    const fill = isOpen ? smoothstep(INK_DIM_TIMING.fillFrom, 1, t) : 0;
    const fade = isOpen ? 1 : 1 - smoothstep(0.75, 1, t);
    const data = new Float32Array([
      w,
      h,
      dt,
      now / 1000,
      (rect.left - box.left) / cell,
      (rect.top - box.top) / cell,
      (rect.right - box.left) / cell,
      (rect.bottom - box.top) / cell,
      (rect.left - prev.left) / cell / dt,
      (rect.top - prev.top) / cell / dt,
      radius / cell,
      t,
      emit,
      isOpen ? INK_DIM_TIMING.speed / cell : INK_DIM_TIMING.swirl / cell,
      INK_DIM_TIMING.vorticity,
      // The thickest ink is 2.2, and it is gone at 85% of the close.
      2.2 / (0.85 * (current.duration / 1000)),
      tint[0],
      tint[1],
      tint[2],
      tint[3],
      current.from * current.level(),
      fill,
      fade,
      isOpen ? 0 : 1,
      cw,
      ch,
      isOpen ? 0 : INK_DIM_TIMING.core * smoothstep(0, 0.2, t),
      INK_DIM_TIMING.source,
    ]);
    try {
      gpu.device.queue.writeBuffer(gpu.uniforms, 0, data);
      encode(current);
    } catch (error) {
      console.warn("ink dim", error);
      stop();
      current.onDone();
      return;
    }
    frame = requestAnimationFrame(tick);
  }

  function encode(current: Run) {
    if (!gpu || !context || !fields) return;
    const { device, pipes, layout, sampler, uniforms } = gpu;
    const encoder = device.createCommandEncoder();
    const f = fields;
    const draw = (pipe: string, target: GPUTextureView, a: Field, b: Field) => {
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: target,
            loadOp: "clear",
            storeOp: "store",
            clearValue: [0, 0, 0, 0],
          },
        ],
      });
      pass.setPipeline(pipes[pipe]);
      pass.setBindGroup(
        0,
        device.createBindGroup({
          layout,
          entries: [
            { binding: 0, resource: { buffer: uniforms } },
            { binding: 1, resource: a.view },
            { binding: 2, resource: b.view },
            { binding: 3, resource: sampler },
          ],
        }),
      );
      pass.draw(3);
      pass.end();
    };
    const swap = (name: string) => {
      const pair = f[name];
      pair.reverse();
    };
    const get = (name: string, index = 0) => f[name][index];

    if (current.isFresh) {
      current.isFresh = false;
      if (current.mode === "open") {
        for (const name of ["vel", "dye"]) {
          encoder
            .beginRenderPass({
              colorAttachments: [
                {
                  view: get(name).view,
                  loadOp: "clear",
                  storeOp: "store",
                  clearValue: [0, 0, 0, 0],
                },
              ],
            })
            .end();
        }
      } else {
        draw("fsInitDye", get("dye").view, get("vel"), get("vel"));
        draw("fsInitVel", get("vel").view, get("dye"), get("dye"));
      }
    }

    draw("fsCurl", get("curl").view, get("vel"), get("vel"));
    draw("fsForces", get("vel", 1).view, get("vel"), get("curl"));
    swap("vel");
    draw("fsDiv", get("div").view, get("vel"), get("vel"));
    for (let i = 0; i < PRESSURE_STEPS; i++) {
      draw("fsPressure", get("press", 1).view, get("press"), get("div"));
      swap("press");
    }
    draw("fsGrad", get("vel", 1).view, get("press"), get("vel"));
    swap("vel");
    draw("fsAdvectVel", get("vel", 1).view, get("vel"), get("vel"));
    swap("vel");
    draw("fsAdvectDye", get("dye", 1).view, get("vel"), get("dye"));
    swap("dye");

    const context_ = context;
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: context_.getCurrentTexture().createView(),
          loadOp: "clear",
          storeOp: "store",
          clearValue: [0, 0, 0, 0],
        },
      ],
    });
    pass.setPipeline(pipes.fsDisplay);
    pass.setBindGroup(
      0,
      device.createBindGroup({
        layout,
        entries: [
          { binding: 0, resource: { buffer: uniforms } },
          { binding: 1, resource: get("dye").view },
          { binding: 2, resource: get("dye").view },
          { binding: 3, resource: sampler },
        ],
      }),
    );
    pass.draw(3);
    pass.end();
    device.queue.submit([encoder.finish()]);
  }

  return {
    warm,
    attach,
    canRun,
    open(options: InkRunOptions) {
      start("open", options);
    },
    close(options: InkRunOptions) {
      start("close", options);
    },
    stop,
  };
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
}

/** @internal */
export type InkDim = ReturnType<typeof createInkDim>;
