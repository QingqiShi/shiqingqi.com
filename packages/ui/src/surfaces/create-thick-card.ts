import {
  GPU_BUFFER_USAGE,
  GPU_SHADER_STAGE,
} from "../effect-layer/constants.ts";
import { readEffectLayerMode } from "../effect-layer/read-effect-layer-mode.ts";
import { THICK_CARD_WGSL } from "./thick-card-wgsl.ts";

/**
 * The dials of the thick card: the tilt at its largest, in degrees; how
 * thick the edge shows at that tilt, in CSS px; and what draws the edge.
 * `solid` and `glass` draw a rounded edge on the GPU, in the card's
 * material or as clear glass; `css` stacks copies of the card behind it.
 *
 * @internal
 */
export interface ThickCardDials {
  readonly tilt: number;
  readonly thickness: number;
  readonly edge: "solid" | "glass" | "css";
}

/** @internal */
export const THICK_CARD_DEFAULTS: ThickCardDials = {
  tilt: 10,
  thickness: 9,
  edge: "solid",
};

const PERSPECTIVE = 900;
const OPEN_MS = 1000;
// The card holds its full tilt this long while it moves fastest.
const OPEN_HOLD_MS = 120;
const FRAME_MS = 1000 / 60;
const MARGIN = 40;
const BEVEL = 6;
const MAX_LAYERS = 16;
// The rounded edge shows less of the slab's depth than a straight wall.
const ROUND_DEPTH = 1.4;

interface Gpu {
  readonly device: GPUDevice;
  readonly format: GPUTextureFormat;
  readonly pipeline: GPURenderPipeline;
  readonly uniforms: GPUBuffer;
  readonly group: GPUBindGroup;
}

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
    const module = device.createShaderModule({ code: THICK_CARD_WGSL });
    const layout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPU_SHADER_STAGE.FRAGMENT,
          buffer: { type: "uniform" },
        },
      ],
    });
    const pipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [layout] }),
      vertex: { module, entryPoint: "vs" },
      fragment: { module, entryPoint: "fs", targets: [{ format }] },
      primitive: { topology: "triangle-list" },
    });
    const uniforms = device.createBuffer({
      size: 5 * 16,
      usage: GPU_BUFFER_USAGE.UNIFORM | GPU_BUFFER_USAGE.COPY_DST,
    });
    const group = device.createBindGroup({
      layout,
      entries: [{ binding: 0, resource: { buffer: uniforms } }],
    });
    return { device, format, pipeline, uniforms, group };
  } catch {
    return null;
  }
}

function parseColor(value: string): [number, number, number] {
  const numbers = value.match(/[\d.]+/g)?.map(Number) ?? [];
  const [r = 255, g = 255, b = 255] = numbers;
  return [r / 255, g / 255, b / 255];
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
}

/**
 * The tilt as the card comes in, as a share of the full tilt, `ms` after
 * the start: it holds, then a damped spring takes it to flat, a little
 * past flat and back.
 */
function openShare(ms: number) {
  const t = Math.max(ms - OPEN_HOLD_MS, 0) / 1000;
  const zeta = 0.55;
  const damped = 5.98;
  const decay = (zeta * damped) / Math.sqrt(1 - zeta * zeta);
  const spring =
    Math.exp(-decay * t) *
    (Math.cos(damped * t) + (decay / damped) * Math.sin(damped * t));
  return spring * (1 - smoothstep(0.75 * OPEN_MS, OPEN_MS, ms));
}

function tiltTransform(
  degrees: number,
  width: number,
  height: number,
  depth = 0,
) {
  const cx = String(width / 2);
  const cy = String(height / 2);
  return (
    `translate(${cx}px, 0px) perspective(${String(PERSPECTIVE)}px) ` +
    `translate(0px, ${cy}px) rotateX(${String(-degrees)}deg) ` +
    `translate(-${cx}px, -${cy}px) translateZ(${String(-depth)}px)`
  );
}

interface Run {
  readonly tilt: Animation;
  readonly samples: readonly number[];
  readonly duration: number;
  readonly dials: ThickCardDials;
  readonly width: number;
  readonly height: number;
  readonly radius: number;
  readonly exponent: number;
  readonly base: readonly [number, number, number];
  readonly isDark: boolean;
}

/**
 * Tilts a Sheet's card as it comes and goes, so that it shows as a slab
 * with a thick edge while it moves and is the plain card at rest. The tilt
 * is one set of keyframes on the card; the edge reads the same keyframes
 * at the same time, so it never parts from the card.
 *
 * @internal
 */
export function createThickCard() {
  let gpu: Gpu | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let context: GPUCanvasContext | null = null;
  let run: Run | null = null;
  let frame = 0;
  let extras: Animation[] = [];
  let layers: HTMLElement[] = [];

  function warm() {
    gpuPromise ??= requestGpu();
    void gpuPromise.then((ready) => {
      gpu = ready;
    });
  }

  function canRun(dials: ThickCardDials) {
    if (window.matchMedia("(forced-colors: active)").matches) return false;
    if (dials.tilt <= 0) return false;
    if (dials.edge === "css") return true;
    return gpu !== null && readEffectLayerMode() !== "off";
  }

  function ensureCanvas(mover: HTMLElement, card: HTMLElement) {
    if (!gpu) return null;
    if (!canvas) {
      const next = document.createElement("canvas");
      next.setAttribute("aria-hidden", "true");
      Object.assign(next.style, {
        position: "absolute",
        left: `-${String(MARGIN)}px`,
        top: `-${String(MARGIN)}px`,
        display: "block",
        pointerEvents: "none",
        visibility: "hidden",
      });
      const nextContext = next.getContext("webgpu");
      if (!(nextContext instanceof GPUCanvasContext)) return null;
      nextContext.configure({
        device: gpu.device,
        format: gpu.format,
        alphaMode: "premultiplied",
      });
      canvas = next;
      context = nextContext;
    }
    if (canvas.parentElement !== mover || canvas.previousSibling !== card) {
      mover.insertBefore(canvas, card.nextSibling);
    }
    return canvas;
  }

  function stop() {
    if (frame !== 0) cancelAnimationFrame(frame);
    frame = 0;
    run?.tilt.cancel();
    run = null;
    for (const animation of extras) animation.cancel();
    extras = [];
    for (const layer of layers) layer.remove();
    layers = [];
    if (canvas) canvas.style.visibility = "hidden";
  }

  function start(
    card: HTMLElement,
    dials: ThickCardDials,
    duration: number,
    share: (ms: number) => number,
  ) {
    stop();
    const mover = card.parentElement;
    if (!mover || typeof card.animate !== "function") return;
    const width = card.offsetWidth;
    const height = card.offsetHeight;
    const style = getComputedStyle(card);
    const base = parseColor(style.backgroundColor);
    const isDark = 0.2126 * base[0] + 0.7152 * base[1] + 0.0722 * base[2] < 0.4;
    const count = Math.max(2, Math.ceil(duration / FRAME_MS) + 1);
    const samples = Array.from(
      { length: count },
      (_, index) => dials.tilt * share((index / (count - 1)) * duration),
    );
    const timing = { duration, easing: "linear", fill: "forwards" } as const;
    card.style.transformOrigin = "0 0";
    const tilt = card.animate(
      samples.map((degrees) => ({
        transform: tiltTransform(degrees, width, height),
      })),
      timing,
    );
    run = {
      tilt,
      samples,
      duration,
      dials,
      width,
      height,
      radius: Number.parseFloat(style.borderTopLeftRadius) || 0,
      exponent: CSS.supports("corner-shape", "squircle") ? 4 : 2,
      base,
      isDark,
    };
    const ended = run;
    tilt.onfinish = () => {
      if (run !== ended) return;
      stop();
      card.style.transformOrigin = "";
    };
    if (dials.edge === "css") {
      stackLayers(card, mover, ended, timing);
      return;
    }
    const target = ensureCanvas(mover, card);
    if (!target) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const cssWidth = width + 2 * MARGIN;
    const cssHeight = height + 2 * MARGIN;
    target.style.width = `${String(cssWidth)}px`;
    target.style.height = `${String(cssHeight)}px`;
    target.width = Math.round(cssWidth * dpr);
    target.height = Math.round(cssHeight * dpr);
    target.style.visibility = "visible";
    draw();
  }

  /** The tilt now, in degrees, as the card's keyframes have it. */
  function tiltNow(current: Run) {
    const time = Number(current.tilt.currentTime ?? 0);
    const at =
      (Math.min(Math.max(time, 0), current.duration) / current.duration) *
      (current.samples.length - 1);
    const index = Math.min(Math.floor(at), current.samples.length - 2);
    const from = current.samples[index] ?? 0;
    const to = current.samples[index + 1] ?? from;
    return from + (to - from) * (at - index);
  }

  function draw() {
    frame = 0;
    const current = run;
    if (!current || !gpu || !context || !canvas) return;
    const degrees = tiltNow(current);
    const { tilt, thickness, edge } = current.dials;
    const share = Math.min(Math.abs(degrees) / tilt, 1);
    const depth =
      (ROUND_DEPTH * thickness * share) / Math.sin((tilt * Math.PI) / 180);
    const dpr = canvas.width / (current.width + 2 * MARGIN);
    const data = new Float32Array([
      current.width + 2 * MARGIN,
      current.height + 2 * MARGIN,
      MARGIN,
      dpr,
      current.width,
      current.height,
      current.radius,
      current.exponent,
      (degrees * Math.PI) / 180,
      PERSPECTIVE,
      depth,
      BEVEL * share,
      ...current.base,
      current.isDark ? 1 : 0,
      share,
      edge === "glass" ? 1 : 0,
      0,
      0,
    ]);
    try {
      gpu.device.queue.writeBuffer(gpu.uniforms, 0, data);
      const encoder = gpu.device.createCommandEncoder();
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: context.getCurrentTexture().createView(),
            loadOp: "clear",
            storeOp: "store",
            clearValue: [0, 0, 0, 0],
          },
        ],
      });
      pass.setPipeline(gpu.pipeline);
      pass.setBindGroup(0, gpu.group);
      pass.draw(3);
      pass.end();
      gpu.device.queue.submit([encoder.finish()]);
    } catch (error) {
      console.warn("thick card", error);
      return;
    }
    frame = requestAnimationFrame(draw);
  }

  /**
   * The CSS edge: copies of the card's shape behind it, a little deeper
   * each, so their top edges show as the card tilts.
   */
  function stackLayers(
    card: HTMLElement,
    mover: HTMLElement,
    current: Run,
    timing: KeyframeAnimationOptions,
  ) {
    const { thickness, tilt } = current.dials;
    const count = Math.min(Math.max(Math.round(thickness), 1), MAX_LAYERS);
    const depth = thickness / Math.sin((tilt * Math.PI) / 180);
    const style = getComputedStyle(card);
    const toward = current.isDark ? 255 : 0;
    const tone = (amount: number) => {
      const [r, g, b] = current.base.map((channel) =>
        Math.round(channel * 255 + (toward - channel * 255) * amount),
      );
      return `rgb(${String(r)} ${String(g)} ${String(b)})`;
    };
    for (let index = count; index >= 1; index--) {
      const layer = document.createElement("div");
      layer.setAttribute("aria-hidden", "true");
      const shade = current.isDark
        ? 0.14 - 0.006 * index
        : 0.05 + 0.012 * index;
      const edgeGradient = `linear-gradient(to right, ${tone(shade * 0.6)}, ${tone(shade * 1.4)})`;
      Object.assign(layer.style, {
        position: "absolute",
        left: "0",
        top: "0",
        width: "100%",
        height: "100%",
        borderRadius: style.borderRadius,
        pointerEvents: "none",
        transformOrigin: "0 0",
        background:
          index === 1
            ? `radial-gradient(closest-side, rgb(255 255 255 / 0.7), transparent) no-repeat, ${edgeGradient}`
            : edgeGradient,
        backgroundSize: index === 1 ? "90px 14px, 100% 100%" : "",
      });
      layer.style.setProperty(
        "corner-shape",
        style.getPropertyValue("corner-shape"),
      );
      mover.insertBefore(layer, card);
      layers.push(layer);
      const z = (depth * index) / count;
      extras.push(
        layer.animate(
          current.samples.map((degrees) => {
            const share = Math.min(Math.abs(degrees) / tilt, 1);
            const frame: Keyframe = {
              transform: tiltTransform(
                degrees,
                current.width,
                current.height,
                z,
              ),
              filter: `brightness(${String(0.9 + 0.12 * share)})`,
            };
            if (index === 1) {
              frame.backgroundPosition = `${String(20 + 30 * share)}% 0%, 0 0`;
            }
            if (index === count) {
              frame.boxShadow = `0 4px 14px rgb(0 0 0 / ${String(0.2 * share)})`;
            }
            return frame;
          }),
          timing,
        ),
      );
    }
  }

  return {
    warm,
    canRun,
    open(card: HTMLElement, dials: ThickCardDials) {
      start(card, dials, OPEN_MS, openShare);
    },
    close(card: HTMLElement, dials: ThickCardDials, duration: number) {
      start(card, dials, duration, (ms) => smoothstep(0, 0.7 * duration, ms));
    },
    stop(card?: HTMLElement) {
      stop();
      if (card) card.style.transformOrigin = "";
    },
  };
}

/** @internal */
export type ThickCard = ReturnType<typeof createThickCard>;
