import { CAN_HOVER_QUERY } from "../can-hover-query.ts";
import { clamp } from "../clamp.ts";
import { GPU_SHADER_STAGE, PREMULTIPLIED_BLEND } from "./constants.ts";
import { createBinding } from "./create-binding.ts";
import { createPackedBuffer } from "./create-packed-buffer.ts";
import { roleBits } from "./effect-roles.ts";
import { instanceRange } from "./instance-range.ts";
import { leanLight, type LightContext } from "./lean-light.ts";
import { HAND_SECONDS } from "./liquid-effect.ts";
import { markEffectDrawn } from "./mark-effect-drawn.ts";
import { readSheetPose, type SheetPose } from "./publish-sheet-pose.ts";
import {
  readCornerExponent,
  readFill,
  resolveCornerRadii,
  type CornerRadii,
} from "./read-element-box.ts";
import { srgbToOklab } from "./ripple-color.ts";
import { SHEET_SURFACE } from "./sheet-edge-band.ts";
import {
  packSheetEdgeHeights,
  packSheetEdgeInstances,
  SHEET_EDGE_INSTANCE_BYTES,
  SHEET_EDGE_WGSL,
  type SheetEdgeInstance,
} from "./sheet-edge-wgsl.ts";
import { LINGER_SET } from "./step-liquid.ts";
import {
  finiteSheetEdge,
  restingSheetEdge,
  SHEET_EDGE_SAMPLES,
  sheetEdgeEnergy,
  stepSheetEdge,
  type SheetEdgeField,
} from "./step-sheet-edge.ts";
import type {
  Effect,
  EffectElementRecord,
  EffectFrame,
  EffectPointer,
  EffectSetup,
} from "./types.ts";

const SHEET_EDGE = roleBits(["sheetEdge"]);
const SAMPLE_BYTES = 4 * SHEET_EDGE_SAMPLES;
/** A frame with no measured time, the first after the loop was idle, steps this far. */
const FIRST_STEP = 1 / 60;
/** Seconds the edge stays wet after it last moved. */
const LINGER = 0.8;
/** Seconds the wet edge takes to set once it has lingered. */
const SET_TIME = 1 / 3;
/** Seconds a set edge takes to melt again when it moves. */
const MELT_TIME = 0.1;
/** The edge is moving while its energy is above this, in px. */
const STILL = 1;
/** The card is moving while its speed is above this, in px per second. */
const CARD_STILL = 2;
/** The radius of the dome of water along the edge, in CSS px. */
const DOME_RADIUS = 14;
const AT_REST: SheetPose = { phase: "shown", y: 0 };

/**
 * What the effect reads from a Sheet's card: its colour, its corners, and
 * the element itself, which it marks while it draws.
 *
 * @internal
 */
export interface SheetSurface {
  readonly element: Element;
  readonly color: readonly [number, number, number];
  readonly lightBody: boolean;
  readonly radii: CornerRadii;
  readonly cornerExponent: number;
}

/**
 * The edge of one Sheet between frames.
 *
 * @internal
 */
export interface SheetEdgeState {
  readonly field: SheetEdgeField;
  /** The card's page y at the last frame. */
  readonly y: number;
  /** The time on the page's clock until which the edge stays wet. */
  readonly wetUntil: number;
  /** How far the wet edge has set, from 0 to 1. */
  readonly firm: number;
  /** The effect draws the band, in place of the top of the card's own fill. */
  readonly active: boolean;
  /** When the effect started to hand the band back, or `null`. */
  readonly handFrom: number | null;
  readonly lean: number;
  readonly toPointer: readonly [number, number];
  /** The card's colour, read while the card paints its own fill. */
  readonly surface: SheetSurface | null;
}

/**
 * Reads the card inside the element that carries a Sheet: the element
 * marked with `SHEET_SURFACE`. Its colour is read only while the card
 * paints its own fill, since the effect takes that fill off the top of the
 * card while it draws; the last colour read serves until then.
 *
 * @internal
 */
export function readSheetSurface(
  host: Element,
  width: number,
  height: number,
  known: SheetSurface | null,
): SheetSurface | null {
  const element = host.querySelector(`[${SHEET_SURFACE}]`);
  if (element === null) {
    return null;
  }
  const style = getComputedStyle(element);
  const drawn = element.hasAttribute("data-effect-drawn");
  const fill = drawn ? null : readFill(style.backgroundColor);
  const color: readonly [number, number, number] | null =
    fill !== null && fill[3] > 0
      ? [fill[0], fill[1], fill[2]]
      : (known?.color ?? null);
  if (color === null) {
    return null;
  }
  return {
    element,
    color,
    lightBody:
      fill === null && known !== null
        ? known.lightBody
        : srgbToOklab(color)[0] > 0.7,
    radii: resolveCornerRadii(width, height, [
      style.borderTopLeftRadius,
      style.borderTopRightRadius,
      style.borderBottomRightRadius,
      style.borderBottomLeftRadius,
    ]),
    cornerExponent: readCornerExponent(
      style.getPropertyValue("corner-top-left-shape"),
    ),
  };
}

/**
 * Steps one Sheet's edge and lays it out on the page. The card's motion
 * excites the wave, a drag holds a peak under the finger, and the edge
 * stays wet for `LINGER` seconds after it last moved, then sets in
 * `SET_TIME` and hands the top of the card back to the card's own fill.
 * Under reduced motion it draws nothing.
 *
 * @internal
 */
export function layoutSheetEdge(
  record: Pick<EffectElementRecord, "element" | "x" | "y" | "width" | "height">,
  surface: SheetSurface,
  elementIndex: number,
  firstSample: number,
  state: SheetEdgeState | undefined,
  frame: Pick<
    EffectFrame,
    "time" | "delta" | "reducedMotion" | "pointer" | "stages"
  >,
  context: LightContext,
): {
  state: SheetEdgeState;
  instance: SheetEdgeInstance | null;
  /** The effect draws the top of the card, so the card's fill starts below it. */
  drawn: boolean;
  /** Something moves, so the next frame must follow. */
  animating: boolean;
} {
  const pose = readSheetPose(record.element) ?? AT_REST;
  const delta = frame.delta > 0 ? frame.delta : FIRST_STEP;
  // The band is drawn at the stage's layout size, which its `<canvas>`
  // element rides on; a transform on the stage scales both together.
  const { width, height } =
    frame.stages.find(({ element }) => element === elementIndex) ?? record;
  const x0 = record.x + surface.radii[0];
  const x1 = record.x + width - surface.radii[1];
  const centre = { x: record.x + record.width / 2, y: record.y };
  const lit = leanLight(
    context,
    state ?? { lean: 0, toPointer: [0, -1] },
    centre,
    record,
    delta,
    frame.reducedMotion,
  );
  const rest = {
    field: restingSheetEdge(),
    y: record.y,
    wetUntil: 0,
    firm: 1,
    active: false,
    handFrom: null,
    lean: lit.lean,
    toPointer: lit.toPointer,
    surface,
  };
  if (frame.reducedMotion) {
    return { state: rest, instance: null, drawn: false, animating: false };
  }

  const cardVelocity = state === undefined ? 0 : (record.y - state.y) / delta;
  const dragging = pose.phase === "dragging";
  const finger =
    dragging && frame.pointer.present && frame.pointer.pressed
      ? clamp((frame.pointer.x - x0) / Math.max(x1 - x0, 1), 0, 1)
      : null;
  let field = stepSheetEdge(
    state?.field ?? restingSheetEdge(),
    { cardVelocity, stretch: dragging ? Math.max(0, -pose.y) : 0, finger },
    delta,
  );
  field = finiteSheetEdge(field);
  const moving =
    pose.phase === "entering" ||
    pose.phase === "exiting" ||
    dragging ||
    Math.abs(cardVelocity) > CARD_STILL;
  const excited = moving || sheetEdgeEnergy(field) > STILL;
  const wetUntil = excited ? frame.time + LINGER : (state?.wetUntil ?? 0);
  const wet = frame.time < wetUntil;
  const firm = wet
    ? Math.max(0, (state?.firm ?? 1) - delta / MELT_TIME)
    : Math.min(1, (state?.firm ?? 1) + delta / SET_TIME);

  let active = state?.active ?? false;
  let handFrom = state?.handFrom ?? null;
  if (excited || wet || firm < 1) {
    active = true;
    handFrom = null;
  } else if (active && handFrom === null) {
    handFrom = frame.time;
  } else if (active && frame.time - (handFrom ?? 0) >= HAND_SECONDS) {
    active = false;
    handFrom = null;
    field = restingSheetEdge();
  }
  const handing =
    handFrom === null
      ? 1
      : clamp(1 - (frame.time - handFrom) / HAND_SECONDS, 0, 1);
  const next: SheetEdgeState = {
    field,
    y: record.y,
    wetUntil,
    firm,
    active,
    handFrom,
    lean: lit.lean,
    toPointer: lit.toPointer,
    surface,
  };
  if (!active) {
    return { state: next, instance: null, drawn: false, animating: false };
  }
  return {
    state: next,
    drawn: handFrom === null,
    animating: true,
    instance: {
      elementIndex,
      firstSample,
      x: record.x,
      y: record.y,
      width,
      height,
      radii: surface.radii,
      cornerExponent: surface.cornerExponent,
      color: surface.color,
      lightBody: surface.lightBody,
      light: lit.light,
      firm,
      // The lit edge is the solid card's, so it shows only as the edge sets
      // past the wet core it keeps while it lingers.
      edgeLit: clamp((firm - LINGER_SET) / (1 - LINGER_SET), 0, 1) * handing,
      domeRadius: DOME_RADIUS,
      shown: 1,
    },
  };
}

/**
 * Sheet edge: draws the top edge of each Sheet with the role as a water
 * surface across the card's width, on the `<canvas>` element under the
 * Sheet's card, in the card's own colour, as `useSheetEdge` describes. The
 * card's motion, measured each frame by the effect layer, excites the
 * wave, and the pose the Sheet's controller publishes tells it when a drag
 * holds the card and how far above its rest. It marks the card with
 * `markEffectDrawn` while it draws, so that the card starts its own fill
 * below the band then and at no other time.
 *
 * @internal
 */
export const sheetEdgeEffect: Effect = {
  async setup(setup: EffectSetup) {
    const { device, format, pageLayout, targetLayout } = setup;
    const edgeLayout = device.createBindGroupLayout({
      entries: [0, 1].map((binding) => ({
        binding,
        visibility: GPU_SHADER_STAGE.VERTEX | GPU_SHADER_STAGE.FRAGMENT,
        buffer: { type: "read-only-storage" as const },
      })),
    });
    const module = device.createShaderModule({ code: SHEET_EDGE_WGSL });
    const pipeline = await device.createRenderPipelineAsync({
      layout: device.createPipelineLayout({
        bindGroupLayouts: [pageLayout, targetLayout, edgeLayout],
      }),
      vertex: { module, entryPoint: "sheetEdgeVertex" },
      fragment: {
        module,
        entryPoint: "sheetEdgeFragment",
        targets: [{ format, blend: PREMULTIPLIED_BLEND }],
      },
      primitive: { topology: "triangle-strip" },
    });
    const instanceBuffer = createPackedBuffer(
      device,
      SHEET_EDGE_INSTANCE_BYTES,
      packSheetEdgeInstances,
    );
    const heightBuffer = createPackedBuffer(
      device,
      SAMPLE_BYTES,
      packSheetEdgeHeights,
    );
    const binding = createBinding(device, edgeLayout, [
      instanceBuffer,
      heightBuffer,
    ]);
    const states = new Map<number, SheetEdgeState>();
    const drawn = new Set<Element>();
    const hoverQuery = window.matchMedia(CAN_HOVER_QUERY);
    let instances: readonly SheetEdgeInstance[] = [];

    return {
      followsPointer: (pointer: EffectPointer) =>
        pointer.pressed && [...states.values()].some(({ active }) => active),
      update(_encoder, frame) {
        const context: LightContext = {
          pointer: frame.pointer,
          hoverable: hoverQuery.matches,
          viewport: frame.viewport,
        };
        const next: SheetEdgeInstance[] = [];
        const fields: Float32Array[] = [];
        const seen = new Set<Element>();
        const kept = new Set<number>();
        let animating = false;
        for (const [index, record] of frame.elements.entries()) {
          if ((record.roles & SHEET_EDGE) === 0) {
            continue;
          }
          const state = states.get(record.id);
          const surface = readSheetSurface(
            record.element,
            record.width,
            record.height,
            state?.surface ?? null,
          );
          if (surface === null) {
            continue;
          }
          kept.add(record.id);
          const laid = layoutSheetEdge(
            record,
            surface,
            index,
            fields.length * SHEET_EDGE_SAMPLES,
            state,
            frame,
            context,
          );
          states.set(record.id, laid.state);
          animating ||= laid.animating;
          if (laid.drawn) {
            seen.add(surface.element);
          }
          if (laid.instance !== null) {
            next.push(laid.instance);
            fields.push(laid.state.field.height);
          }
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
        for (const element of seen) {
          if (!drawn.has(element)) {
            drawn.add(element);
            markEffectDrawn(element, true);
          }
        }
        instances = next;
        instanceBuffer.write(next);
        heightBuffer.write(fields);
        return animating;
      },
      draw(pass, target) {
        if (target.canvas !== "stageUnder") {
          return;
        }
        const [first, count] = instanceRange(
          instances,
          target.firstElement,
          target.elementCount,
        );
        if (count > 0) {
          pass.setPipeline(pipeline);
          pass.setBindGroup(2, binding());
          pass.draw(4, count, 0, first);
        }
      },
      destroy() {
        for (const element of drawn) {
          markEffectDrawn(element, false);
        }
        drawn.clear();
        instanceBuffer.destroy();
        heightBuffer.destroy();
      },
    };
  },
};
