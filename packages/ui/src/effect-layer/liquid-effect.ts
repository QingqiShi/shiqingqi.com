import {
  LiquidBead,
  LiquidInstance,
  liquidLayout,
  liquidSimulationLayout,
  LiquidSlot,
  LiquidStep,
} from "../_generated/wgsl/layouts.ts";
import { liquidSimulationWgsl } from "../_generated/wgsl/liquid-simulation.ts";
import { liquidWgsl } from "../_generated/wgsl/liquid.ts";
import { compileEffectShader } from "./compile-effect-shader.ts";
import { GPU_BUFFER_USAGE, GPU_MAP_MODE } from "./constants.ts";
import { createBinding } from "./create-binding.ts";
import { createInstancedDraw } from "./create-instanced-draw.ts";
import { createPackedBuffer } from "./create-packed-buffer.ts";
import { createStorageBuffer } from "./create-storage-buffer.ts";
import type { ContentMode } from "./effect-content.ts";
import { roleBits } from "./effect-roles.ts";
import { layoutLiquid, type LiquidState } from "./layout-liquid.ts";
import {
  liquidInstanceValue,
  type LiquidInstanceRecord,
} from "./liquid-instance-value.ts";
import type {
  LiquidBead as LiquidBeadSchema,
  LiquidStep as LiquidStepSchema,
} from "./liquid-layout.ts";
import type { LiquidControl } from "./liquid-reader.ts";
import { markEffectDrawn } from "./mark-effect-drawn.ts";
import { ownedStops } from "./owned-stops.ts";
import { segmentOf } from "./pill-at.ts";
import type { LiquidBody } from "./resting-liquid.ts";
import { dispatch } from "./set-bind-group.ts";
import type { LiquidSnapshot } from "./step-liquid.ts";
import type {
  Effect,
  EffectElementRecord,
  EffectFrame,
  EffectPointer,
  EffectInput,
  EffectSetup,
} from "./types.ts";
import { readLiquidSlot, writeLiquidSlot } from "./write-liquid-slot.ts";

const LIQUID = roleBits(["liquid"]);
const SLOT_BYTES = LiquidSlot.size;
const MIN_SLOT_CAPACITY = 4;
/**
 * How many copies of the simulation buffer can be on their way back to
 * the CPU at once: one is read while the next is being copied, and a
 * third covers a map that takes a frame longer.
 */
const MAX_READBACKS = 3;

/** A finger leaves `:hover` set after a tap, so only a mouse or a pen hovers. */
function isHovered(element: Element, pointer: EffectPointer) {
  return (
    pointer.present &&
    pointer.pointerType !== "touch" &&
    element.matches(":hover")
  );
}

/**
 * How far the pointer is across the page from the left of the control's box,
 * in CSS px, or `null` when it neither is over the control nor presses it.
 * A control can be on any carrier, so its place comes from the browser.
 */
function pointerFromLeft(
  { element, settings }: EffectElementRecord,
  { pointer, viewport }: EffectFrame,
) {
  const pressed = settings.liquid?.pressed === true && pointer.present;
  return pressed || isHovered(element, pointer)
    ? pointer.x - viewport.x - element.getBoundingClientRect().left
    : null;
}

/**
 * How the liquid draws the content of an indicator's track, such as its
 * labels: it covers the content where it can draw the track under it, on a
 * track that is opaque, or that has no fill and shows the page. It cannot
 * draw a translucent track such as Glass, so there it owns the content.
 */
const contentModeOf = ({ thumb, under }: LiquidControl): ContentMode | null =>
  thumb ? null : under[3] === 0 || under[3] >= 0.99 ? "cover" : "own";

/**
 * How near the liquid comes to a segment, in rest radii, before it owns the
 * segment's content. It reads its particles a frame or so late, and this
 * covers how far they move in that time.
 */
const OWN_MARGIN = 1;

const NO_CONTENT = { content: undefined, stops: null, owned: undefined };

/**
 * The content the liquid draws on `control` in `mode`, and the stops whose
 * segments it owns, kept from `before`, with where they start and end along
 * the track in CSS px from the origin, as `LiquidInstanceRecord` takes them.
 */
function liquidContent(
  frame: EffectFrame,
  record: EffectElementRecord,
  control: LiquidControl,
  mode: ContentMode | null,
  extent: readonly [number, number],
  before: readonly [number, number] | null,
) {
  if (mode === null) {
    return NO_CONTENT;
  }
  if (mode === "cover") {
    return frame.drawContent(record, mode)
      ? { ...NO_CONTENT, content: mode }
      : NO_CONTENT;
  }
  const { stops, radius, segments = [] } = control;
  const kept = ownedStops(stops, extent, before, OWN_MARGIN);
  if (
    kept === null ||
    !frame.drawContent(record, mode, segments.slice(kept[0], kept[1] + 1))
  ) {
    return NO_CONTENT;
  }
  const [first, last] = kept;
  return {
    content: mode,
    stops: kept,
    owned: [
      segmentOf(stops[first])[0] * radius,
      segmentOf(stops[last])[1] * radius,
    ] as const,
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
  readonly step: EffectInput<typeof LiquidStepSchema>;
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
 * its own only then. At rest it draws nothing over the control's own surface,
 * unless a pointer is over the control or presses it: then it draws a lit
 * edge. It asks for frames only while something moves.
 *
 * While it draws over the track of an indicator, the liquid shows the
 * content of the track bent through the water, from its snapshot, as
 * `contentModeOf` chooses: it covers the content of the page under the
 * melted liquid, or on a translucent track it draws the content of each
 * segment that the liquid comes near in place of the page's, until the
 * liquid leaves it. Until the snapshot is ready, the content of the page
 * shows through the liquid.
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
    const { device, colorTarget } = setup;
    const [liquid, simulation] = await Promise.all([
      createInstancedDraw(device, liquidWgsl, colorTarget),
      compileEffectShader(device, liquidSimulationWgsl).compute(),
    ]);

    const instanceBuffer = createPackedBuffer(device, LiquidInstance);
    const beadBuffer = createPackedBuffer(device, LiquidBead);
    const stepBuffer = createPackedBuffer(device, LiquidStep);
    const slotFloats = new Float32Array(
      SLOT_BYTES / Float32Array.BYTES_PER_ELEMENT,
    );
    const slots = new Map<number, number>();
    const freeSlots: number[] = [];
    let readbacks: Readback[] = [];
    const latest = new Map<number, LiquidSnapshot>();
    let destroyed = false;

    function createSlotBuffer(capacity: number) {
      return {
        capacity,
        buffer: createStorageBuffer(device, LiquidSlot, capacity),
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
      const from = buffer.buffer;
      // The copy must occur before this frame writes to the new buffer.
      // Thus the copy goes to the queue now, and not in the frame's encoder.
      const copy = device.createCommandEncoder();
      copy.copyBufferToBuffer(from, 0, slotBuffer.buffer.buffer, 0, from.size);
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
      writeLiquidSlot(slotFloats, body);
      device.queue.writeBuffer(
        slotBuffer.buffer.buffer,
        slot * SLOT_BYTES,
        slotFloats,
      );
    }

    /**
     * Copies the simulation buffer to a readback buffer, and maps it once
     * the GPU has filled it. With every readback buffer still on its way,
     * the particles wait for the next frame.
     */
    function readBack(encoder: GPUCommandEncoder, stepped: readonly Stepped[]) {
      const buffer = slotBuffer.buffer.buffer;
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
      const start = Math.min(...slotsRead) * SLOT_BYTES;
      const size = (Math.max(...slotsRead) + 1) * SLOT_BYTES - start;
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
                    step.slot * SLOT_BYTES - start,
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

    const simulationBinding = createBinding(
      device,
      liquidSimulationLayout,
      () => ({ steps: stepBuffer.buffer, slots: slotBuffer.buffer }),
    );
    const liquidBinding = createBinding(device, liquidLayout, () => ({
      liquids: instanceBuffer.buffer,
      slots: slotBuffer.buffer,
      beads: beadBuffer.buffer,
    }));

    const states = new Map<number, LiquidState>();
    /** The stops whose segments each liquid owns the content of. */
    const owning = new Map<number, readonly [number, number]>();
    const drawn = new Set<Element>();
    let instances: readonly LiquidInstanceRecord[] = [];
    let liquidElements: readonly Element[] = [];
    let pointerWasOver = false;

    return {
      followsPointer: (pointer) =>
        pointerWasOver ||
        liquidElements.some((element) => isHovered(element, pointer)),
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
        liquidElements = controls.map(({ record }) => record.element);
        pointerWasOver = false;
        ensureSlotCapacity(slots.size);
        const nextInstances: LiquidInstanceRecord[] = [];
        const beads: EffectInput<typeof LiquidBeadSchema>[] = [];
        const steps: EffectInput<typeof LiquidStepSchema>[] = [];
        const stepped: Stepped[] = [];
        const seen = new Set<Element>();
        const kept = new Set<number>();
        let animating = false;
        let fading = false;
        for (const { index, record, control, slot } of controls) {
          const { id } = record;
          const pointerAt = pointerFromLeft(record, frame);
          pointerWasOver ||= pointerAt !== null;
          const laid = layoutLiquid(
            control,
            record,
            index,
            slot,
            states.get(id),
            frame,
            pointerAt,
            frame.scopes[record.scopeIndex].backdrop,
            latest.get(id) ?? null,
            beads,
          );
          if (laid.drawn) {
            seen.add(record.element);
          }
          kept.add(id);
          states.set(id, laid.state);
          const { content, stops, owned } = liquidContent(
            frame,
            record,
            control,
            laid.drawn ? contentModeOf(control) : null,
            laid.extent,
            owning.get(id) ?? null,
          );
          if (stops === null) {
            owning.delete(id);
          } else {
            owning.set(id, stops);
          }
          nextInstances.push({ ...laid.instance, content, owned });
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
            owning.delete(id);
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
        instanceBuffer.write(nextInstances.map(liquidInstanceValue));
        beadBuffer.write(beads);
        stepBuffer.write(steps);
        if (steps.length > 0) {
          dispatch(encoder, simulation, [simulationBinding()], steps.length);
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
