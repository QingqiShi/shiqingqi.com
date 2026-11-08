import { useEffect, useRef } from "react";
import { useMotionEngine } from "../motion/use-motion-engine.ts";
import { calmPond, dropStone } from "./drop-stone.ts";
import { roleBits } from "./effect-roles.ts";
import { NO_SETTINGS } from "./effect-setting-defaults.ts";
import { useEffectRegistration } from "./use-effect-registration.ts";

const POND_ROLE = roleBits(["pond"]);

/**
 * Makes an element a small calm pond, whose border is the shore: attach the
 * returned `ref` to the element. A press with the primary button drops a
 * stone where it lands, and a cancelled press calms the water. Rings travel
 * out from where each stone lands and fade out over the shore. The rings of
 * a new stone add to the rings that run already, as on water. Water is seen
 * through: the effect layer draws the element's content bent through the
 * rings, from its content snapshot, and lights the same water, so that the
 * slopes that face the light glint and the slopes that face away are in
 * shade. Outside an `EffectLayerProvider`, without WebGPU, or under reduced
 * motion, nothing shows.
 *
 * The element needs `data-effect-content`, and `data-effect-omit` on each
 * part of its content that moves each frame, such as a fill that slides
 * under it. While the rings run, the element has
 * `data-effect-content-drawn`: then hide each other child with
 * `filter: opacity(0)`, and keep the element's own fill, border and focus
 * ring. The rings do not bend those, because they fade out over the shore.
 *
 * `pressDelay` is the time in seconds from a press to the first ring, for
 * an element that first gives way under the finger.
 *
 * @internal
 */
export function usePond({ pressDelay = 0 }: { pressDelay?: number } = {}) {
  const engine = useMotionEngine();
  const register = useEffectRegistration(POND_ROLE, NO_SETTINGS);
  const elementRef = useRef<HTMLElement | null>(null);
  // React calls the cleanup of `ref` at each render. Thus only an unmount
  // calms the pond.
  const pondRef = useRef<HTMLElement | null>(null);
  useEffect(
    () => () => {
      if (pondRef.current !== null) calmPond(pondRef.current);
    },
    [],
  );
  function dropAt(clientX: number, clientY: number, delay: number) {
    const element = elementRef.current;
    if (element === null || engine.reducedMotion) return;
    const box = element.getBoundingClientRect();
    pondRef.current = element;
    dropStone({
      element,
      loop: engine.loop,
      x: ((clientX - box.left) * element.offsetWidth) / box.width,
      y: ((clientY - box.top) * element.offsetHeight) / box.height,
      delay,
    });
  }

  function calm() {
    if (elementRef.current !== null) calmPond(elementRef.current);
  }

  return {
    ref: (element: HTMLElement | null) => {
      elementRef.current = element;
      const unregister = register(element);
      const listeners = new AbortController();
      element?.addEventListener(
        "pointerdown",
        (event) => {
          if (event.button === 0 && !element.matches(":disabled")) {
            dropAt(event.clientX, event.clientY, pressDelay);
          }
        },
        { passive: true, signal: listeners.signal },
      );
      element?.addEventListener("pointercancel", calm, {
        passive: true,
        signal: listeners.signal,
      });
      return () => {
        listeners.abort();
        elementRef.current = null;
        unregister?.();
      };
    },
    /** Drops a stone at a point in client coordinates, after `delay` seconds. */
    drop(clientX: number, clientY: number, { delay = 0 } = {}) {
      dropAt(clientX, clientY, delay);
    },
    /** Drops a stone at the centre of `target`, or of the pond without one. */
    dropAtCentreOf(target: Element | null) {
      const box = (target ?? elementRef.current)?.getBoundingClientRect();
      if (box !== undefined) {
        dropAt(box.left + box.width / 2, box.top + box.height / 2, 0);
      }
    },
    /** Stops the rings. */
    calm,
  };
}
