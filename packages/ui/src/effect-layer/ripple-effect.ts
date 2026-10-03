import {
  GPU_BUFFER_USAGE,
  GPU_SHADER_STAGE,
  PREMULTIPLIED_BLEND,
} from "./constants.ts";
import {
  createRipples,
  type RippleCause,
  type RippleStep,
} from "./create-ripples.ts";
import { roleBits } from "./effect-roles.ts";
import { parseCssColor, type EffectColor } from "./parse-css-color.ts";
import {
  packRippleInstances,
  RIPPLE_INSTANCE_BYTES,
  RIPPLE_WGSL,
} from "./ripple-wgsl.ts";
import type { Effect } from "./types.ts";

const RIPPLE_BIT = roleBits(["ripple"]);
const AMBIENT_BIT = roleBits(["rippleAmbient"]);
const MIN_CAPACITY = 8;
const WHITE: EffectColor = [1, 1, 1, 1];
/** The still ring under reduced motion: while pressed, and while hovered or focused. */
const HELD_STRENGTH = { press: 0.8, hover: 0.45 } as const;

/** The page's background colour, which the `<canvas>` elements draw over. */
function readBackdrop(): EffectColor {
  for (const element of [document.documentElement, document.body]) {
    const color = parseCssColor(getComputedStyle(element).backgroundColor);
    if (color !== null && color[3] > 0) {
      return color;
    }
  }
  return WHITE;
}

function heldStrength(element: Element) {
  if (element.matches(":active")) {
    return HELD_STRENGTH.press;
  }
  return element.matches(":hover, :focus-visible, :has(:focus-visible)")
    ? HELD_STRENGTH.hover
    : 0;
}

const isNode = (target: EventTarget | null): target is Node =>
  target instanceof Node;

/**
 * The effect behind `Ripple`. It starts pulses from DOM events on the
 * rippling elements, so a pointer that moves elsewhere costs no frame.
 *
 * @internal
 */
export const rippleEffect: Effect = {
  async setup({ device, format, pageLayout, targetLayout, requestFrame }) {
    const rippleLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPU_SHADER_STAGE.VERTEX | GPU_SHADER_STAGE.FRAGMENT,
          buffer: { type: "read-only-storage" },
        },
      ],
    });
    const module = device.createShaderModule({ code: RIPPLE_WGSL });
    const pipeline = await device.createRenderPipelineAsync({
      layout: device.createPipelineLayout({
        bindGroupLayouts: [pageLayout, targetLayout, rippleLayout],
      }),
      vertex: { module, entryPoint: "rippleVertex" },
      fragment: {
        module,
        entryPoint: "rippleFragment",
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
        size: capacity * RIPPLE_INSTANCE_BYTES,
        usage: GPU_BUFFER_USAGE.STORAGE | GPU_BUFFER_USAGE.COPY_DST,
      });
      bindGroup = device.createBindGroup({
        layout: rippleLayout,
        entries: [{ binding: 0, resource: { buffer } }],
      });
      packed = new ArrayBuffer(capacity * RIPPLE_INSTANCE_BYTES);
    }

    const ripples = createRipples();
    let rippling: readonly Element[] = [];
    let reducedMotion = false;
    let step: RippleStep | null = null;
    let beatTimer: ReturnType<typeof setTimeout> | undefined;
    let scheduledBeat: number | null = null;

    /** The rippling elements that hold `target`. */
    const holding = (target: EventTarget | null) =>
      isNode(target)
        ? rippling.filter((element) => element.contains(target))
        : [];
    /** The rippling elements that `event` moved into from outside. */
    const entered = ({ target, relatedTarget }: PointerEvent | FocusEvent) =>
      holding(target).filter(
        (element) => !isNode(relatedTarget) || !element.contains(relatedTarget),
      );
    function start(
      elements: readonly Element[],
      cause: RippleCause,
      x = 0,
      y = 0,
    ) {
      for (const element of elements) {
        ripples.start(element, cause, x + window.scrollX, y + window.scrollY);
      }
      if (elements.length > 0) {
        requestFrame();
      }
    }

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
    listen("pointerover", (event) => {
      if (event.pointerType !== "touch") {
        start(entered(event), "hover", event.clientX, event.clientY);
      }
    });
    listen("pointerdown", (event) => {
      start(holding(event.target), "press", event.clientX, event.clientY);
    });
    listen("focusin", (event) => {
      const { target } = event;
      if (target instanceof Element && target.matches(":focus-visible")) {
        start(entered(event), "focus");
      }
    });
    // Under reduced motion, each of these can change the still ring.
    for (const type of [
      "pointerover",
      "pointerout",
      "pointerup",
      "focusin",
      "focusout",
    ] as const) {
      listen(type, (event) => {
        if (reducedMotion && holding(event.target).length > 0) {
          requestFrame();
        }
      });
    }

    function scheduleBeat(nextBeat: number | null, time: number) {
      if (nextBeat === scheduledBeat) {
        return;
      }
      clearTimeout(beatTimer);
      scheduledBeat = nextBeat;
      if (nextBeat !== null) {
        beatTimer = setTimeout(
          () => {
            scheduledBeat = null;
            requestFrame();
          },
          Math.max(0, (nextBeat - time) * 1000),
        );
      }
    }

    return {
      update(_encoder, frame) {
        rippling = frame.elements.flatMap((record) =>
          (record.roles & RIPPLE_BIT) === 0 ? [] : [record.element],
        );
        reducedMotion = frame.reducedMotion;
        const { velocityX, velocityY } = frame.pointer;
        step = ripples.step({
          time: frame.time,
          elements: frame.elements,
          rippleBit: RIPPLE_BIT,
          ambientBit: AMBIENT_BIT,
          pointerSpeed: Math.hypot(velocityX, velocityY),
          viewport: frame.viewport,
          reducedMotion,
          held: heldStrength,
        });
        scheduleBeat(step.nextBeat, frame.time);

        const { instances } = step;
        if (instances.length > 0) {
          ensureCapacity(instances.length);
          packRippleInstances(
            instances,
            frame.elements,
            readBackdrop(),
            packed,
          );
          if (buffer !== null) {
            device.queue.writeBuffer(
              buffer,
              0,
              packed,
              0,
              instances.length * RIPPLE_INSTANCE_BYTES,
            );
          }
        }
        return step.animating;
      },
      draw(pass, target) {
        if (step === null || bindGroup === null) {
          return;
        }
        const { instances, documentInstances } = step;
        const [first, count] =
          target.canvas === "scroll"
            ? [0, documentInstances]
            : [documentInstances, instances.length - documentInstances];
        if (count === 0) {
          return;
        }
        pass.setPipeline(pipeline);
        pass.setBindGroup(2, bindGroup);
        pass.draw(4, count, 0, first);
      },
      destroy() {
        clearTimeout(beatTimer);
        listeners.abort();
        buffer?.destroy();
      },
    };
  },
};
