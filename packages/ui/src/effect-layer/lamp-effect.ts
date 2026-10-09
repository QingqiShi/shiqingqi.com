import {
  GPU_BUFFER_USAGE,
  GPU_SHADER_STAGE,
  PREMULTIPLIED_BLEND,
} from "./constants.ts";
import { instanceRange } from "./create-ripples.ts";
import { roleBits } from "./effect-roles.ts";
import { lampOccluders } from "./lamp-occluders.ts";
import { lampPalette } from "./lamp-palette.ts";
import { lampSource, parseTranslateX, type LampSource } from "./lamp-source.ts";
import {
  LAMP_INSTANCE_BYTES,
  LAMP_WGSL,
  lampReach,
  packLampInstances,
  type LampInstance,
} from "./lamp-wgsl.ts";
import type { EffectColor } from "./parse-css-color.ts";
import { peersOf } from "./plan-scopes.ts";
import { fadeGlow, stepGlow, type Glow } from "./step-glow.ts";
import type { Effect, EffectElementRecord } from "./types.ts";

const LAMP_BIT = roleBits(["lamp"]);
const MIN_CAPACITY = 4;
/** Under reduced motion the light crosses from off to on in this time. */
const CROSSFADE_SECONDS = 0.15;
/** Below this a lamp going out has gone, and draws nothing. */
const DARK_GLOW = 1 / 255;

/** Events on a Lamp after which its light can have moved or changed. */
const LAMP_EVENTS = [
  "pointermove",
  "pointerup",
  "pointercancel",
  "click",
  "keydown",
] as const;

/** What the effect keeps about one Lamp between frames. */
interface LampState {
  glow: Glow;
  /** The fill the lamp last had while lit, which it keeps as it goes out. */
  litFill: EffectColor;
}

/**
 * Whether the element's lamp is on: a checked `<input>` that is not
 * indeterminate, or an element with `aria-checked="true"`.
 */
function isLit(element: Element) {
  if (element instanceof HTMLInputElement) {
    return element.checked && !element.indeterminate;
  }
  return element.getAttribute("aria-checked") === "true";
}

/**
 * Where the element's light is now: at its `::before`, as the Switch's
 * thumb is laid out, or else at its centre.
 */
function readSource(record: EffectElementRecord): LampSource {
  const { element } = record;
  const thumb = getComputedStyle(element, "::before");
  const thumbWidth = Number.parseFloat(thumb.width);
  if (!Number.isFinite(thumbWidth) || thumbWidth <= 0) {
    return {
      x: record.x + record.width / 2,
      y: record.y + record.height / 2,
      radius: Math.min(record.width, record.height) / 2,
    };
  }
  const paddingLeft = Number.parseFloat(getComputedStyle(element).paddingLeft);
  return lampSource(
    record,
    Number.isFinite(paddingLeft) ? paddingLeft : 0,
    thumbWidth,
    parseTranslateX(thumb.transform),
  );
}

/** Whether a CSS transition or animation runs on the element or its `::before`. */
function isMoving(element: Element) {
  return element
    .getAnimations({ subtree: true })
    .some((animation) => animation.playState === "running");
}

const isNode = (target: EventTarget | null): target is Node =>
  target instanceof Node;

/**
 * The effect behind `useLamp`. It reads each Lamp's state and its thumb from
 * the DOM on each frame it draws, and asks for frames itself while a lamp
 * swells on, dies out or slides, and on each pointer event on a lamp, so a
 * drag moves the light.
 *
 * @internal
 */
export const lampEffect: Effect = {
  async setup({ device, format, pageLayout, targetLayout, requestFrame }) {
    const lampLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPU_SHADER_STAGE.VERTEX | GPU_SHADER_STAGE.FRAGMENT,
          buffer: { type: "read-only-storage" },
        },
      ],
    });
    const module = device.createShaderModule({ code: LAMP_WGSL });
    const pipeline = await device.createRenderPipelineAsync({
      layout: device.createPipelineLayout({
        bindGroupLayouts: [pageLayout, targetLayout, lampLayout],
      }),
      vertex: { module, entryPoint: "lampVertex" },
      fragment: {
        module,
        entryPoint: "lampFragment",
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
        size: capacity * LAMP_INSTANCE_BYTES,
        usage: GPU_BUFFER_USAGE.STORAGE | GPU_BUFFER_USAGE.COPY_DST,
      });
      bindGroup = device.createBindGroup({
        layout: lampLayout,
        entries: [{ binding: 0, resource: { buffer } }],
      });
      packed = new ArrayBuffer(capacity * LAMP_INSTANCE_BYTES);
    }

    // By element, not by registration id: a re-render can register the
    // element again, and the light must not start over.
    const states = new Map<Element, LampState>();
    let lamps: readonly Element[] = [];
    let instances: LampInstance[] = [];

    const listeners = new AbortController();
    for (const type of LAMP_EVENTS) {
      window.addEventListener(
        type,
        ({ target }) => {
          if (
            isNode(target) &&
            lamps.some((element) => element.contains(target))
          ) {
            requestFrame();
          }
        },
        { capture: true, passive: true, signal: listeners.signal },
      );
    }

    return {
      update(_encoder, frame) {
        const { elements, scopes, reducedMotion, delta } = frame;
        lamps = elements.flatMap((record) =>
          (record.roles & LAMP_BIT) === 0 ? [] : [record.element],
        );
        instances = [];
        let animating = false;
        let crossfading = false;
        const seen = new Set<Element>();
        for (const [elementIndex, record] of elements.entries()) {
          if ((record.roles & LAMP_BIT) === 0) {
            continue;
          }
          const { element } = record;
          seen.add(element);
          const target = isLit(element) ? 1 : 0;
          let state = states.get(element);
          if (state === undefined) {
            // A lamp that is lit when first seen is already on: no swell.
            state = {
              glow: { value: target, velocity: 0 },
              litFill: record.fill,
            };
            states.set(element, state);
          }
          if (target === 1) {
            state.litFill = record.fill;
          }
          const next = reducedMotion
            ? fadeGlow(state.glow, target, delta, 1 / CROSSFADE_SECONDS)
            : stepGlow(state.glow, target, delta);
          state.glow = { value: next.value, velocity: next.velocity };
          if (!next.settled) {
            animating = true;
            crossfading ||= reducedMotion;
          }
          if (next.value <= DARK_GLOW) {
            continue;
          }
          const source = readSource(record);
          const scope = scopes[record.scopeIndex];
          const palette = lampPalette(state.litFill, scope.dark);
          animating ||= isMoving(element);
          instances.push({
            elementIndex,
            source,
            intensity: next.value,
            core: palette.core,
            glow: palette.glow,
            dark: scope.dark,
            occluders: lampOccluders(
              elements,
              peersOf(scopes, record),
              elementIndex,
              source,
              lampReach(source),
            ),
          });
        }
        for (const element of states.keys()) {
          if (!seen.has(element)) {
            states.delete(element);
          }
        }
        if (instances.length > 0) {
          ensureCapacity(instances.length);
          packLampInstances(instances, packed);
          if (buffer !== null) {
            device.queue.writeBuffer(
              buffer,
              0,
              packed,
              0,
              instances.length * LAMP_INSTANCE_BYTES,
            );
          }
        }
        // The layer draws no frame of its own under reduced motion; the
        // crossfade asks for each of its frames.
        if (crossfading) {
          requestFrame();
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
        buffer?.destroy();
      },
    };
  },
};
