import {
  GPU_BUFFER_USAGE,
  GPU_SHADER_STAGE,
  PREMULTIPLIED_BLEND,
} from "./constants.ts";
import { instanceRange } from "./create-ripples.ts";
import { roleBits } from "./effect-roles.ts";
import {
  EFFECT_SETTING_DEFAULTS,
  finiteOr,
} from "./effect-setting-defaults.ts";
import {
  LIQUID_INSTANCE_BYTES,
  LIQUID_THUMB_WGSL,
  packLiquidInstances,
  type LiquidInstance,
} from "./liquid-thumb-wgsl.ts";
import { markLiquidThumbDrawn } from "./mark-liquid-thumb-drawn.ts";
import { readFill } from "./read-element-box.ts";
import {
  liquidPull,
  restingDrop,
  stepLiquidThumb,
  type LiquidDrop,
} from "./step-liquid-thumb.ts";
import type { Effect, EffectElementRecord, EffectFrame } from "./types.ts";

const LIQUID_THUMB = roleBits(["liquidThumb"]);
const MIN_CAPACITY = 4;
/**
 * The first step after the drop has rested is one frame long, however long
 * it rested: the time in between moved nothing.
 */
const FIRST_STEP = 1 / 60;
/** Under reduced motion a drag still pulls the drop, but only this much. */
const REDUCED_PULL = 0.5;
const CAN_HOVER_QUERY = "(hover: hover) and (pointer: fine)";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const isNode = (target: EventTarget | null): target is Node =>
  target instanceof Node;

interface DropState {
  readonly drop: LiquidDrop;
  /** The drag setting at the last step, to tell a release. */
  readonly drag: number | null;
}

/** What the Switch's thumb looks like, from its `::before` and its own style. */
function readThumb(element: Element) {
  const thumb = getComputedStyle(element, "::before");
  const own = getComputedStyle(element);
  const diameter = Number.parseFloat(thumb.width);
  return {
    color: readFill(thumb.backgroundColor),
    diameter: Number.isFinite(diameter) && diameter > 0 ? diameter : null,
    opacity: finiteOr(Number.parseFloat(own.opacity), 1),
  };
}

/**
 * Steps one Switch's drop and lays it out on the page, or gives `null` for a
 * Switch with no thumb to draw.
 */
function layoutDrop(
  record: EffectElementRecord,
  elementIndex: number,
  state: DropState | undefined,
  frame: EffectFrame,
  canHover: boolean,
): { state: DropState; instance: LiquidInstance } | null {
  const thumb = readThumb(record.element);
  if (thumb.diameter === null) {
    return null;
  }
  const settings =
    record.settings.liquidThumb ?? EFFECT_SETTING_DEFAULTS.liquidThumb;
  const travel = Math.max(0, record.width - record.height);
  const radius = thumb.diameter / 2;
  const target = clamp(finiteOr(settings.position, 0), 0, 1) * travel;
  const drag =
    settings.drag === null
      ? null
      : clamp(finiteOr(settings.drag, 0), 0, 1) * travel;
  const previous = state?.drop ?? restingDrop(target);
  const pressed = record.element.matches(":active");
  const hovered = canHover && record.element.matches(":hover");
  const drop = stepLiquidThumb(
    previous,
    {
      target,
      drag,
      travel,
      radius,
      room: radius,
      pressed,
      lifted: hovered || pressed || drag !== null,
      // The pointer's velocity is smoothed and may have fallen since the
      // release, so the drop's own speed after the pointer counts too.
      releaseSpeed:
        state !== undefined && state.drag !== null && drag === null
          ? Math.max(
              Math.abs(frame.pointer.velocityX),
              Math.abs(previous.velocity),
            )
          : 0,
      reducedMotion: frame.reducedMotion,
    },
    previous.settled ? Math.min(frame.delta, FIRST_STEP) : frame.delta,
  );

  const centreY = record.y + record.height / 2;
  const centreX = record.x + record.height / 2 + drop.x;
  let pull: LiquidInstance["pull"] = null;
  if (drag !== null && frame.pointer.present) {
    const reach = liquidPull(
      frame.pointer.x - centreX,
      frame.pointer.y - centreY,
      radius,
      { ahead: travel - drop.x, behind: drop.x, room: radius },
    );
    const scale = frame.reducedMotion ? REDUCED_PULL : 1;
    pull = {
      x: centreX + reach.x * scale,
      y: centreY + reach.y * scale,
      radius: reach.radius,
    };
  }
  return {
    state: { drop, drag },
    instance: {
      elementIndex,
      radius,
      opacity: thumb.opacity,
      x: centreX,
      y: centreY,
      scaleX: 1 + drop.stretch,
      scaleY: 1 / (1 + drop.stretch),
      pull,
      droplet:
        drop.droplet === null
          ? null
          : {
              x: record.x + record.height / 2 + drop.droplet.x,
              y: centreY + drop.droplet.y,
              radius: drop.droplet.radius,
            },
      trail:
        drop.trail === null
          ? null
          : {
              fromX: record.x + record.height / 2 + drop.trail.from,
              toX: centreX,
              y: centreY,
              wet: drop.trail.wet,
            },
      color: [thumb.color[0], thumb.color[1], thumb.color[2]],
      lift: drop.lift,
    },
  };
}

/**
 * Liquid thumb: draws the thumb of each Switch with the role as a drop of
 * liquid, in the colour and at the size of the thumb the Switch draws
 * itself, and tells the Switch while it does, so the Switch's own thumb hides
 * only then. The drop springs across the track on a toggle, squashes against
 * its end and wobbles to rest; a drag stretches it after the pointer, a fast
 * release throws a droplet off its back that arcs and merges again, and it
 * leaves a wet trail that dries. It asks for frames only while a drop moves.
 * Under reduced motion the drop goes straight to its place.
 *
 * @internal
 */
export const liquidThumbEffect: Effect = {
  async setup({ device, format, pageLayout, targetLayout, requestFrame }) {
    const liquidLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPU_SHADER_STAGE.VERTEX | GPU_SHADER_STAGE.FRAGMENT,
          buffer: { type: "read-only-storage" },
        },
      ],
    });
    const module = device.createShaderModule({ code: LIQUID_THUMB_WGSL });
    const pipeline = await device.createRenderPipelineAsync({
      layout: device.createPipelineLayout({
        bindGroupLayouts: [pageLayout, targetLayout, liquidLayout],
      }),
      vertex: { module, entryPoint: "liquidVertex" },
      fragment: {
        module,
        entryPoint: "liquidFragment",
        targets: [{ format, blend: PREMULTIPLIED_BLEND }],
      },
      primitive: { topology: "triangle-strip" },
    });

    let capacity = 0;
    let buffer: GPUBuffer | null = null;
    let bindGroup: GPUBindGroup | null = null;
    let packed = new ArrayBuffer(0);
    function ensureCapacity(count: number) {
      if (count <= capacity) {
        return;
      }
      capacity = Math.max(MIN_CAPACITY, 2 ** Math.ceil(Math.log2(count)));
      buffer?.destroy();
      buffer = device.createBuffer({
        size: capacity * LIQUID_INSTANCE_BYTES,
        usage: GPU_BUFFER_USAGE.STORAGE | GPU_BUFFER_USAGE.COPY_DST,
      });
      bindGroup = device.createBindGroup({
        layout: liquidLayout,
        entries: [{ binding: 0, resource: { buffer } }],
      });
      packed = new ArrayBuffer(capacity * LIQUID_INSTANCE_BYTES);
    }

    const canHover = window.matchMedia(CAN_HOVER_QUERY);
    const states = new Map<number, DropState>();
    const drawn = new Set<Element>();
    let instances: readonly LiquidInstance[] = [];
    let dragging = false;

    const listeners = new AbortController();
    const listen = <Type extends keyof WindowEventMap>(
      type: Type,
      handler: (event: WindowEventMap[Type]) => void,
    ) => {
      window.addEventListener(type, handler, {
        capture: true,
        passive: true,
        signal: listeners.signal,
      });
    };
    const onDrawnSwitch = ({ target }: Event) => {
      if (
        isNode(target) &&
        [...drawn].some((element) => element.contains(target))
      ) {
        requestFrame();
      }
    };
    // Each of these can lift, press or release a drop.
    for (const type of [
      "pointerover",
      "pointerout",
      "pointerdown",
      "pointerup",
      "pointercancel",
    ] as const) {
      listen(type, onDrawnSwitch);
    }
    // A drag's pull follows the pointer where the Switch's own drag position
    // stays the same: past the end of the track, or off its centre line.
    listen("pointermove", () => {
      if (dragging) {
        requestFrame();
      }
    });

    return {
      update(_encoder, frame) {
        const next: LiquidInstance[] = [];
        const seen = new Set<Element>();
        const kept = new Set<number>();
        let animating = false;
        dragging = false;
        for (const [index, record] of frame.elements.entries()) {
          if ((record.roles & LIQUID_THUMB) === 0) {
            continue;
          }
          const laid = layoutDrop(
            record,
            index,
            states.get(record.id),
            frame,
            canHover.matches,
          );
          if (laid === null) {
            continue;
          }
          seen.add(record.element);
          kept.add(record.id);
          states.set(record.id, laid.state);
          next.push(laid.instance);
          animating ||= !laid.state.drop.settled;
          dragging ||= laid.state.drag !== null;
        }
        for (const id of states.keys()) {
          if (!kept.has(id)) {
            states.delete(id);
          }
        }
        for (const element of drawn) {
          if (!seen.has(element)) {
            drawn.delete(element);
            markLiquidThumbDrawn(element, false);
          }
        }
        instances = next;
        if (next.length > 0) {
          ensureCapacity(next.length);
          packLiquidInstances(next, packed);
          if (buffer !== null) {
            device.queue.writeBuffer(
              buffer,
              0,
              packed,
              0,
              next.length * LIQUID_INSTANCE_BYTES,
            );
          }
        }
        for (const element of seen) {
          if (!drawn.has(element)) {
            drawn.add(element);
            markLiquidThumbDrawn(element, true);
          }
        }
        return animating;
      },
      draw(pass, target) {
        if (bindGroup === null) {
          return;
        }
        const [first, count] = instanceRange(
          instances,
          target.firstElement,
          target.elementCount,
        );
        if (count === 0) {
          return;
        }
        pass.setPipeline(pipeline);
        pass.setBindGroup(2, bindGroup);
        pass.draw(4, count, 0, first);
      },
      destroy() {
        listeners.abort();
        for (const element of drawn) {
          markLiquidThumbDrawn(element, false);
        }
        drawn.clear();
        buffer?.destroy();
      },
    };
  },
};
