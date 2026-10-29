import { RippleInstance, rippleLayout } from "../_generated/wgsl/layouts.ts";
import { rippleWgsl } from "../_generated/wgsl/ripple.ts";
import { createBinding } from "./create-binding.ts";
import { createInstancedDraw } from "./create-instanced-draw.ts";
import { createPackedBuffer } from "./create-packed-buffer.ts";
import {
  createRipples,
  type RippleCause,
  type RippleInstanceRecord,
} from "./create-ripples.ts";
import { roleBits } from "./effect-roles.ts";
import { rippleInstanceValue } from "./ripple-instance-value.ts";
import type { Effect } from "./types.ts";

const RIPPLE_BIT = roleBits(["ripple"]);
const AMBIENT_BIT = roleBits(["rippleAmbient"]);
/** The still ring under reduced motion: while pressed, and while hovered or focused. */
const HELD_STRENGTH = { press: 0.8, hover: 0.45 } as const;

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
 * The effect behind `useRipple`. It starts pulses from DOM events on the
 * rippling elements, so a pointer that moves elsewhere costs no frame.
 *
 * @internal
 */
export const rippleEffect: Effect = {
  async setup(setup) {
    const { device, colorTarget, requestFrame } = setup;
    const ripple = await createInstancedDraw(device, rippleWgsl, colorTarget);
    const buffer = createPackedBuffer(device, RippleInstance);
    const binding = createBinding(device, rippleLayout, () => ({
      ripples: buffer.buffer,
    }));

    const ripples = createRipples();
    let rippling: readonly Element[] = [];
    let reducedMotion = false;
    let instances: readonly RippleInstanceRecord[] = [];

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

    return {
      update(_encoder, frame) {
        rippling = frame.elements.flatMap((record) =>
          (record.roles & RIPPLE_BIT) === 0 ? [] : [record.element],
        );
        reducedMotion = frame.reducedMotion;
        const { velocityX, velocityY } = frame.pointer;
        const step = ripples.step({
          time: frame.time,
          elements: frame.elements,
          scopes: frame.scopes,
          rippleBit: RIPPLE_BIT,
          ambientBit: AMBIENT_BIT,
          pointerSpeed: Math.hypot(velocityX, velocityY),
          viewport: frame.viewport,
          reducedMotion,
          held: heldStrength,
        });
        instances = step.instances;
        buffer.write(
          instances.map((instance) => rippleInstanceValue(instance, frame)),
        );
        return step.animating || (step.nextBeat ?? false);
      },
      draw(pass, target) {
        ripple.draw(pass, target, instances, binding);
      },
      destroy() {
        listeners.abort();
        buffer.destroy();
      },
    };
  },
};
