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
 * `drag` is the tilt at its largest while a drag moves the card, in
 * degrees, and 0 keeps the card flat under a drag.
 *
 * @internal
 */
export interface ThickCardDials {
  readonly tilt: number;
  readonly thickness: number;
  readonly edge: "solid" | "glass" | "css";
  readonly drag: number;
}

/** @internal */
export const THICK_CARD_DEFAULTS: ThickCardDials = {
  tilt: 10,
  thickness: 9,
  edge: "solid",
  drag: 16,
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
// The drag's speed, in px per ms, that gives about three quarters of the
// drag tilt, and the pull, in px, that adds its share.
const DRAG_SPEED = 0.8;
const DRAG_PULL = 260;
const PULL_SHARE = 0.2;
// The spring that smooths the tilt under a drag, and the looser one that
// takes it back to flat, a little past flat and back, after the drag.
const FOLLOW = { omega: 20, zeta: 0.85 };
const RETURN = { omega: 11, zeta: 0.42 };
const TILT = "--thick-tilt";
const SHARE = "--thick-share";
const SLIDE = "--thick-slide";

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
function openShare(ms: number, hold = OPEN_HOLD_MS) {
  const t = Math.max(ms - hold, 0) / 1000;
  const zeta = 0.55;
  const damped = 5.98;
  const decay = (zeta * damped) / Math.sqrt(1 - zeta * zeta);
  const spring =
    Math.exp(-decay * t) *
    (Math.cos(damped * t) + (decay / damped) * Math.sin(damped * t));
  return spring * (1 - smoothstep(0.75 * OPEN_MS, OPEN_MS, ms));
}

/** `angle` is a CSS angle, such as `10deg` or a `calc()` of a variable. */
function tiltTransform(
  angle: string,
  width: number,
  height: number,
  depth = 0,
) {
  const cx = String(width / 2);
  const cy = String(height / 2);
  return (
    `translate(${cx}px, 0px) perspective(${String(PERSPECTIVE)}px) ` +
    `translate(0px, ${cy}px) rotateX(calc(-1 * ${angle})) ` +
    `translate(-${cx}px, -${cy}px) translateZ(${String(-depth)}px)`
  );
}

function degreesOf(value: number) {
  return `${String(value)}deg`;
}

const LIVE_ANGLE = `calc(var(${TILT}, 0) * 1deg)`;

/**
 * What a drag is doing now: its speed, in px per ms, down positive, and how
 * far down it has taken the card, in px.
 *
 * @internal
 */
export interface DragFeel {
  readonly velocity: number;
  readonly pull: number;
}

interface Scene {
  readonly card: HTMLElement;
  readonly mover: HTMLElement;
  readonly dials: ThickCardDials;
  /** The tilt, in degrees, at which the edge shows its full thickness. */
  readonly reference: number;
  readonly width: number;
  readonly height: number;
  readonly radius: number;
  readonly exponent: number;
  readonly base: readonly [number, number, number];
  readonly isDark: boolean;
}

interface Keys {
  readonly animation: Animation;
  readonly samples: readonly number[];
  readonly duration: number;
}

interface Live {
  angle: number;
  speed: number;
  time: number;
  /** What the drag is doing, or `null` once the drag lets go. */
  feel: (() => DragFeel) | null;
}

/**
 * Tilts a Sheet's card as it comes and goes, and as a drag moves it, so
 * that it shows as a slab with a thick edge while it moves and is the plain
 * card at rest. As it comes and goes, the tilt is one set of keyframes on
 * the card, and the edge reads the same keyframes. Under a drag, a spring
 * takes the tilt to one that follows the drag's speed, and each frame
 * writes it to CSS variables on the mover, which the card and the CSS edge
 * read, and to the GPU edge.
 *
 * @internal
 */
export function createThickCard() {
  let gpu: Gpu | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let context: GPUCanvasContext | null = null;
  let scene: Scene | null = null;
  let keys: Keys | null = null;
  let live: Live | null = null;
  let frame = 0;
  let extras: Animation[] = [];
  let layers: HTMLElement[] = [];

  function warm() {
    gpuPromise ??= requestGpu();
    void gpuPromise.then((ready) => {
      gpu = ready;
    });
  }

  function canDraw(dials: ThickCardDials) {
    if (window.matchMedia("(forced-colors: active)").matches) return false;
    if (dials.edge === "css") return true;
    return gpu !== null && readEffectLayerMode() !== "off";
  }

  function canRun(dials: ThickCardDials) {
    return dials.tilt > 0 && canDraw(dials);
  }

  function canFollow(dials: ThickCardDials) {
    return dials.drag > 0 && canDraw(dials);
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

  /** The tilt now, in degrees. */
  function degreesNow() {
    if (live) return live.angle;
    if (!keys) return 0;
    const time = Number(keys.animation.currentTime ?? 0);
    const at =
      (Math.min(Math.max(time, 0), keys.duration) / keys.duration) *
      (keys.samples.length - 1);
    const index = Math.min(Math.floor(at), keys.samples.length - 2);
    const from = keys.samples[index] ?? 0;
    const to = keys.samples[index + 1] ?? from;
    return from + (to - from) * (at - index);
  }

  function stop() {
    if (frame !== 0) cancelAnimationFrame(frame);
    frame = 0;
    keys?.animation.cancel();
    keys = null;
    live = null;
    for (const animation of extras) animation.cancel();
    extras = [];
    for (const layer of layers) layer.remove();
    layers = [];
    if (canvas) canvas.style.visibility = "hidden";
    if (scene) {
      scene.card.style.transform = "";
      scene.card.style.transformOrigin = "";
      for (const name of [TILT, SHARE, SLIDE]) {
        scene.mover.style.removeProperty(name);
      }
    }
    scene = null;
  }

  /** Measures the card and puts the edge in place, flat. */
  function prepare(
    card: HTMLElement,
    dials: ThickCardDials,
    reference: number,
  ) {
    stop();
    const mover = card.parentElement;
    if (!mover || typeof card.animate !== "function") return null;
    const style = getComputedStyle(card);
    const base = parseColor(style.backgroundColor);
    const next: Scene = {
      card,
      mover,
      dials,
      reference,
      width: card.offsetWidth,
      height: card.offsetHeight,
      radius: Number.parseFloat(style.borderTopLeftRadius) || 0,
      exponent: CSS.supports("corner-shape", "squircle") ? 4 : 2,
      base,
      isDark: 0.2126 * base[0] + 0.7152 * base[1] + 0.0722 * base[2] < 0.4,
    };
    scene = next;
    card.style.transformOrigin = "0 0";
    card.style.transform = tiltTransform(LIVE_ANGLE, next.width, next.height);
    writeLive(next, 0);
    if (dials.edge === "css") {
      stackLayers(next);
      return next;
    }
    const target = ensureCanvas(mover, card);
    if (!target) return next;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const cssWidth = next.width + 2 * MARGIN;
    const cssHeight = next.height + 2 * MARGIN;
    target.style.width = `${String(cssWidth)}px`;
    target.style.height = `${String(cssHeight)}px`;
    target.width = Math.round(cssWidth * dpr);
    target.height = Math.round(cssHeight * dpr);
    target.style.visibility = "visible";
    return next;
  }

  function writeLive(current: Scene, degrees: number) {
    const share = Math.min(Math.abs(degrees) / current.reference, 1);
    const slide = Math.min(Math.max(degrees / current.reference, -1), 1);
    current.mover.style.setProperty(TILT, String(degrees));
    current.mover.style.setProperty(SHARE, String(share));
    current.mover.style.setProperty(SLIDE, String(slide));
  }

  function startKeys(
    card: HTMLElement,
    dials: ThickCardDials,
    duration: number,
    share: (ms: number) => number,
  ) {
    const current = prepare(card, dials, dials.tilt);
    if (!current) return;
    const count = Math.max(2, Math.ceil(duration / FRAME_MS) + 1);
    const samples = Array.from(
      { length: count },
      (_, index) => dials.tilt * share((index / (count - 1)) * duration),
    );
    const timing = { duration, easing: "linear", fill: "forwards" } as const;
    const animation = card.animate(
      samples.map((degrees) => ({
        transform: tiltTransform(
          degreesOf(degrees),
          current.width,
          current.height,
        ),
      })),
      timing,
    );
    keys = { animation, samples, duration };
    const ended = keys;
    animation.onfinish = () => {
      if (keys === ended) stop();
    };
    if (dials.edge === "css") {
      animateLayers(current, samples, timing);
      return;
    }
    tick(performance.now());
  }

  function follow(
    card: HTMLElement,
    dials: ThickCardDials,
    feel: () => DragFeel,
  ) {
    const from = degreesNow();
    const speed = live?.speed ?? 0;
    if (!prepare(card, dials, dials.drag)) return;
    live = { angle: from, speed, time: performance.now(), feel };
    tick(performance.now());
  }

  function dragTarget(current: Scene, feel: DragFeel) {
    const velocity = feel.velocity < 0 ? feel.velocity * 0.5 : feel.velocity;
    const share =
      (1 - PULL_SHARE) * Math.tanh(velocity / DRAG_SPEED) +
      PULL_SHARE * Math.tanh(feel.pull / DRAG_PULL);
    return current.dials.drag * share;
  }

  /** Moves the live tilt one frame along its spring; `false` once it rests. */
  function step(current: Scene, state: Live, now: number) {
    const dt = Math.min(Math.max(now - state.time, 0), 50) / 1000;
    state.time = now;
    const target = state.feel ? dragTarget(current, state.feel()) : 0;
    const { omega, zeta } = state.feel ? FOLLOW : RETURN;
    const substeps = Math.max(1, Math.ceil(dt / 0.008));
    const h = dt / substeps;
    for (let index = 0; index < substeps; index++) {
      const accel =
        omega * omega * (target - state.angle) - 2 * zeta * omega * state.speed;
      state.speed += accel * h;
      state.angle += state.speed * h;
    }
    writeLive(current, state.angle);
    return !(
      !state.feel &&
      Math.abs(state.angle) < 0.02 &&
      Math.abs(state.speed) < 0.3
    );
  }

  function tick(now: number) {
    frame = 0;
    const current = scene;
    if (!current) return;
    if (live && !step(current, live, now)) {
      stop();
      return;
    }
    if (current.dials.edge !== "css") draw(current);
    if (current.dials.edge === "css" && !live) return;
    frame = requestAnimationFrame(tick);
  }

  function draw(current: Scene) {
    if (!gpu || !context || !canvas) return;
    const degrees = degreesNow();
    const { thickness, edge } = current.dials;
    const { reference } = current;
    const share = Math.min(Math.abs(degrees) / reference, 1);
    // Under a drag the slab keeps more of its depth at a small tilt, so a
    // moderate drag shows the edge too.
    const grow = live ? Math.sqrt(share) : share;
    const depth =
      (ROUND_DEPTH * thickness * grow) / Math.sin((reference * Math.PI) / 180);
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
    }
  }

  /**
   * The CSS edge: copies of the card's shape behind it, a little deeper
   * each, so their top edges show as the card tilts. They read the tilt
   * from the mover's CSS variables.
   */
  function stackLayers(current: Scene) {
    const { card, mover, reference } = current;
    const { thickness } = current.dials;
    const count = Math.min(Math.max(Math.round(thickness), 1), MAX_LAYERS);
    const depth = thickness / Math.sin((reference * Math.PI) / 180);
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
      const z = (depth * index) / count;
      layer.dataset.depth = String(z);
      Object.assign(layer.style, {
        position: "absolute",
        left: "0",
        top: "0",
        width: "100%",
        height: "100%",
        borderRadius: style.borderRadius,
        pointerEvents: "none",
        transformOrigin: "0 0",
        transform: tiltTransform(LIVE_ANGLE, current.width, current.height, z),
        filter: `brightness(calc(0.9 + 0.12 * var(${SHARE}, 0)))`,
        background:
          index === 1
            ? `radial-gradient(closest-side, rgb(255 255 255 / 0.7), transparent) no-repeat, ${edgeGradient}`
            : edgeGradient,
        backgroundSize: index === 1 ? "90px 14px, 100% 100%" : "",
        backgroundPosition:
          index === 1 ? `calc(50% + 40% * var(${SLIDE}, 0)) 0%, 0 0` : "",
        boxShadow:
          index === count
            ? `0 4px 14px rgb(0 0 0 / calc(0.2 * var(${SHARE}, 0)))`
            : "",
      });
      layer.style.setProperty(
        "corner-shape",
        style.getPropertyValue("corner-shape"),
      );
      mover.insertBefore(layer, card);
      layers.push(layer);
    }
  }

  function animateLayers(
    current: Scene,
    samples: readonly number[],
    timing: KeyframeAnimationOptions,
  ) {
    const { tilt } = current.dials;
    const count = layers.length;
    layers.forEach((layer, position) => {
      const index = count - position;
      const z = Number(layer.dataset.depth);
      extras.push(
        layer.animate(
          samples.map((degrees) => {
            const share = Math.min(Math.abs(degrees) / tilt, 1);
            const keyframe: Keyframe = {
              transform: tiltTransform(
                degreesOf(degrees),
                current.width,
                current.height,
                z,
              ),
              filter: `brightness(${String(0.9 + 0.12 * share)})`,
            };
            if (index === 1) {
              keyframe.backgroundPosition = `${String(20 + 30 * share)}% 0%, 0 0`;
            }
            if (index === count) {
              keyframe.boxShadow = `0 4px 14px rgb(0 0 0 / ${String(0.2 * share)})`;
            }
            return keyframe;
          }),
          timing,
        ),
      );
    });
  }

  return {
    warm,
    canRun,
    canFollow,
    open(card: HTMLElement, dials: ThickCardDials) {
      const from = degreesNow();
      if (Math.abs(from) < 0.05) {
        startKeys(card, dials, OPEN_MS, openShare);
        return;
      }
      // An open that interrupts a tilt goes on from that tilt.
      startKeys(
        card,
        dials,
        OPEN_MS,
        (ms) => (from / dials.tilt) * openShare(ms, 0),
      );
    },
    close(card: HTMLElement, dials: ThickCardDials, duration: number) {
      if (live) {
        live.feel = null;
        return;
      }
      startKeys(card, dials, duration, (ms) =>
        smoothstep(0, 0.7 * duration, ms),
      );
    },
    /** Tilts the card with a drag until `release`. */
    follow,
    /** Lets the tilt of a drag spring back to flat. */
    release() {
      if (live) live.feel = null;
    },
    stop() {
      stop();
    },
  };
}

/** @internal */
export type ThickCard = ReturnType<typeof createThickCard>;
