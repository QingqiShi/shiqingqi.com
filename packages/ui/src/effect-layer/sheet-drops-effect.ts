import {
  GPU_BUFFER_USAGE,
  GPU_SHADER_STAGE,
  PREMULTIPLIED_BLEND,
} from "./constants.ts";
import { roleBits } from "./effect-roles.ts";
import { subscribeSheetPoses } from "./publish-sheet-pose.ts";
import {
  LIQUID_HIDDEN,
  LIQUID_STATE,
  SHEET_DROPS_TIMING,
} from "./sheet-drops-timing.ts";
import {
  MAX_SHEET_DROPS,
  SHEET_DROPS_BYTES,
  SHEET_DROPS_WGSL,
} from "./sheet-drops-wgsl.ts";
import type { Effect, EffectElementRecord } from "./types.ts";

const DROPS_BIT = roleBits(["sheetDrops"]);
const FORM_S = SHEET_DROPS_TIMING.formMs / 1000;
const SET_S = SHEET_DROPS_TIMING.setMs / 1000;
const BREAK_S = SHEET_DROPS_TIMING.breakMs / 1000;
/** How far the smooth union reaches, in CSS px: how soon two drops neck. */
const UNION_REACH = 30;
/** How far outside its shape the card's body starts, in CSS px. */
const BODY_LIFT = 60;
/** The number of small drops that trail the big ones. */
const SMALL_DROPS = 8;
const SHADOW = 0.22;

/** One drop, relative to the card's top-left corner. */
interface DropSpec {
  readonly targetX: number;
  readonly targetY: number;
  readonly radius: number;
  /** When it starts, as a share of the run. */
  readonly delay: number;
  /** Two random numbers from 0 to 1 for its path. */
  readonly a: number;
  readonly b: number;
}

interface Run {
  kind: "form" | "break";
  mode: "rise" | "condense";
  start: number;
  revealed: boolean;
  drops: DropSpec[];
  width: number;
  height: number;
}

function random(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    return state / 4_294_967_296;
  };
}

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);
const smoothstep = (from: number, to: number, value: number) => {
  const x = clamp01((value - from) / (to - from));
  return x * x * (3 - 2 * x);
};
const easeOutCubic = (x: number) => 1 - (1 - x) ** 3;
const easeOutBack = (x: number) => {
  const c = 1.2;
  return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2;
};

/** Lays the drops out over a card of this size: big drops on a jittered grid, and a few small ones. */
function layOutDrops(width: number, height: number, seed: number): DropSpec[] {
  const next = random(seed);
  const columns = width > 480 ? 5 : 4;
  const cell = width / columns;
  const rows = Math.min(Math.max(Math.round(height / cell), 2), 6);
  const cellHeight = height / rows;
  const base = 0.55 * Math.min(cell, cellHeight);
  const drops: DropSpec[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const radius = base * (0.8 + 0.3 * next());
      const x = (column + 0.5 + (next() - 0.5) * 0.4) * cell;
      const y = (row + 0.5 + (next() - 0.5) * 0.4) * cellHeight;
      drops.push({
        targetX: Math.min(Math.max(x, radius * 0.6), width - radius * 0.6),
        targetY: Math.min(Math.max(y, radius * 0.6), height - radius * 0.6),
        radius,
        // The top rows go furthest, so they lead.
        delay: 0.22 * (row / rows) + 0.08 * next(),
        a: next(),
        b: next(),
      });
    }
  }
  for (let index = 0; index < SMALL_DROPS; index += 1) {
    drops.push({
      targetX: (0.1 + 0.8 * next()) * width,
      targetY: (0.1 + 0.8 * next()) * height,
      radius: base * (0.18 + 0.17 * next()),
      delay: 0.3 * next(),
      a: next(),
      b: next(),
    });
  }
  return drops.slice(0, MAX_SHEET_DROPS);
}

interface Pose {
  /** The drops, relative to the card's top-left corner: x, y, radius. */
  readonly drops: (readonly [number, number, number])[];
  /** 0 for no body, 1 for the whole card. */
  readonly body: number;
  readonly reach: number;
  readonly firm: number;
  readonly reveal: number;
}

/**
 * Where the drops are `time` seconds into the run. `bottom` is the bottom
 * of the screen, relative to the card's top.
 */
function poseAt(run: Run, time: number, bottom: number): Pose {
  const { width, height } = run;
  if (run.kind === "break") {
    const u = clamp01(time / BREAK_S);
    return {
      drops: run.drops.map((drop) => {
        const fall = clamp01((u - drop.delay) / (1 - drop.delay));
        const distance =
          Math.max(bottom - drop.targetY, 0) + drop.radius * 2 + 40;
        return [
          drop.targetX + (drop.a - 0.5) * 50 * fall,
          drop.targetY + distance * fall * fall,
          drop.radius * smoothstep(0, 0.3, u) * (1 - 0.3 * fall),
        ];
      }),
      body: 1 - smoothstep(0.05, 0.55, u),
      reach: UNION_REACH,
      firm: 0,
      reveal: 0,
    };
  }
  const u = time / FORM_S;
  const absorb = smoothstep(0.82, 1, u);
  const drops = run.drops.map((drop): readonly [number, number, number] => {
    const span = 0.62 - 0.1 * drop.b;
    const p = clamp01((u - drop.delay) / span);
    if (run.mode === "condense") {
      // The stage's canvas reaches only a little past the card, so the
      // drops stay inside it.
      const r = drop.radius;
      const inside = (value: number, size: number) =>
        Math.min(Math.max(value, r), size - r);
      const targetX = inside(drop.targetX, width);
      const targetY = inside(drop.targetY, height);
      const startX = inside(targetX + (drop.a - 0.5) * 140, width);
      const startY = inside(targetY + (drop.b - 0.5) * 140, height);
      const e = easeOutCubic(p);
      return [
        startX + (targetX - startX) * e,
        startY + (targetY - startY) * e,
        r * e * (1 - absorb),
      ];
    }
    const startX = drop.targetX + (drop.a - 0.5) * 0.35 * width;
    const startY =
      Math.max(bottom, height) + drop.radius * 1.2 + drop.b * 90 + 20;
    const sway = Math.sin(p * Math.PI * 2 + drop.a * 6.28) * 12 * (1 - p);
    return [
      startX + (drop.targetX - startX) * easeOutCubic(p) + sway,
      startY + (drop.targetY - startY) * easeOutBack(p),
      drop.radius * (0.55 + 0.45 * easeOutCubic(p)) * (1 - absorb),
    ];
  });
  return {
    drops,
    body: smoothstep(0.4, 0.92, u),
    reach: 1 + (UNION_REACH - 1) * (1 - absorb),
    firm: clamp01((time - FORM_S) / SET_S),
    reveal: time >= FORM_S ? 1 : 0,
  };
}

const pipelines = new WeakMap<GPUDevice, Promise<GPURenderPipeline>>();

/**
 * The effect behind a Sheet's `liquid` prop. When the Sheet's controller
 * marks the mover with `LIQUID_STATE`, it takes the card: drops of the
 * card's colour rise from below the screen, or condense in place from
 * `md` up, and merge into the card, which is wet for a moment and sets
 * from its centre out while the card's content fades in. On `break` the
 * card goes wet and breaks into drops that fall off the screen. It draws on
 * the over `<canvas>` element of the Sheet's Effect stage, and runs frames
 * only while it forms or breaks the card.
 *
 * @internal
 */
export const sheetDropsEffect: Effect = {
  async setup({ device, format, pageLayout, targetLayout, requestFrame }) {
    const layout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPU_SHADER_STAGE.VERTEX | GPU_SHADER_STAGE.FRAGMENT,
          buffer: { type: "uniform" },
        },
      ],
    });
    let pipeline = pipelines.get(device);
    if (pipeline === undefined) {
      const module = device.createShaderModule({ code: SHEET_DROPS_WGSL });
      pipeline = device.createRenderPipelineAsync({
        layout: device.createPipelineLayout({
          bindGroupLayouts: [pageLayout, targetLayout, layout],
        }),
        vertex: { module, entryPoint: "dropsVertex" },
        fragment: {
          module,
          entryPoint: "dropsFragment",
          targets: [{ format, blend: PREMULTIPLIED_BLEND }],
        },
        primitive: { topology: "triangle-strip" },
      });
      pipelines.set(device, pipeline);
    }
    const ready = await pipeline;
    const buffer = device.createBuffer({
      size: SHEET_DROPS_BYTES,
      usage: GPU_BUFFER_USAGE.UNIFORM | GPU_BUFFER_USAGE.COPY_DST,
    });
    const bindGroup = device.createBindGroup({
      layout: ready.getBindGroupLayout(2),
      entries: [{ binding: 0, resource: { buffer } }],
    });
    const data = new Float32Array(SHEET_DROPS_BYTES / 4);
    const runs = new WeakMap<Element, Run>();
    let seed = 1;
    /** The index in `EffectFrame.elements` of the card drawn this frame, or -1. */
    let drawn = -1;
    const unsubscribe = subscribeSheetPoses(requestFrame);

    function pack(record: EffectElementRecord, pose: Pose, bottom: number) {
      const { x, y, width, height } = record;
      data.fill(0);
      let minX = Number.POSITIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;
      const margin = pose.reach + 16;
      const include = (
        left: number,
        top: number,
        right: number,
        end: number,
      ) => {
        minX = Math.min(minX, left - margin);
        minY = Math.min(minY, top - margin);
        maxX = Math.max(maxX, right + margin);
        maxY = Math.max(maxY, end + margin);
      };
      if (pose.body > 0) include(x, y, x + width, y + height);
      let count = 0;
      for (const [dropX, dropY, radius] of pose.drops) {
        if (radius <= 0.5) continue;
        const pageX = x + dropX;
        const pageY = y + dropY;
        if (pageY - radius > y + bottom + margin) continue;
        data.set([pageX, pageY, radius, 0], 20 + count * 4);
        include(pageX - radius, pageY - radius, pageX + radius, pageY + radius);
        count += 1;
      }
      if (minX > maxX) return false;
      const half = Math.min(width, height) / 2;
      const inset = (1 - pose.body) * half;
      data.set([minX, minY, maxX, Math.min(maxY, y + bottom + margin)], 0);
      data.set(
        [x + width / 2, y + height / 2, width / 2 - inset, height / 2 - inset],
        4,
      );
      data.set(
        [record.radii[0], (1 - pose.body) * BODY_LIFT, pose.reach, pose.firm],
        8,
      );
      data.set([count, half, pose.reveal, SHADOW], 12);
      data.set(record.fill, 16);
      device.queue.writeBuffer(buffer, 0, data);
      return true;
    }

    return {
      update(_encoder, frame) {
        drawn = -1;
        let animating = false;
        const screenBottom = frame.viewport.y + frame.viewport.height;
        for (const [index, record] of frame.elements.entries()) {
          if ((record.roles & DROPS_BIT) === 0 || record.stage === null) {
            continue;
          }
          const host = record.element.closest(`[${LIQUID_STATE}]`);
          const state = host?.getAttribute(LIQUID_STATE);
          if (!host || !state) continue;
          let run = runs.get(record.element);
          if (state === "rise" || state === "condense") {
            seed += 1;
            run = {
              kind: "form",
              mode: state,
              start: frame.time,
              revealed: false,
              drops: layOutDrops(record.width, record.height, seed),
              width: record.width,
              height: record.height,
            };
            runs.set(record.element, run);
            host.setAttribute(LIQUID_STATE, "form");
          } else if (state === "break") {
            seed += 1;
            run = {
              kind: "break",
              mode: run?.mode ?? "rise",
              start: frame.time,
              revealed: false,
              drops: layOutDrops(record.width, record.height, seed),
              width: record.width,
              height: record.height,
            };
            runs.set(record.element, run);
            host.setAttribute(LIQUID_STATE, "breaking");
            host.setAttribute(LIQUID_HIDDEN, "");
          }
          if (run === undefined) continue;
          const time = frame.time - run.start;
          const end = run.kind === "form" ? FORM_S + SET_S : BREAK_S;
          if (time >= end) {
            if (run.kind === "form") {
              host.removeAttribute(LIQUID_STATE);
              runs.delete(record.element);
            }
            continue;
          }
          if (run.kind === "form" && time >= FORM_S && !run.revealed) {
            run.revealed = true;
            host.removeAttribute(LIQUID_HIDDEN);
            host.setAttribute(LIQUID_STATE, "set");
          }
          animating = true;
          if (drawn === -1) {
            const bottom = screenBottom - record.y;
            if (pack(record, poseAt(run, time, bottom), bottom)) {
              drawn = index;
            }
          }
        }
        return animating;
      },
      draw(pass, target) {
        if (
          drawn === -1 ||
          target.canvas !== "stageOver" ||
          drawn < target.firstElement ||
          drawn >= target.firstElement + target.elementCount
        ) {
          return;
        }
        pass.setPipeline(ready);
        pass.setBindGroup(2, bindGroup);
        pass.draw(4);
      },
      destroy() {
        unsubscribe();
        buffer.destroy();
      },
    };
  },
};
