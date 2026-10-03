import type { EffectPointer } from "./types.ts";

/** How fast the velocity follows the pointer and falls once it stops, in ms. */
const VELOCITY_TIME_CONSTANT = 50;
/** How long a pointer can go without an event before its velocity falls. */
const IDLE_GRACE = 32;

/**
 * Moves a smoothed velocity towards a new sample taken `elapsed` ms after the
 * last one.
 *
 * @internal
 */
export function smoothVelocity(
  current: number,
  sample: number,
  elapsed: number,
) {
  return (
    current +
    (sample - current) * (1 - Math.exp(-elapsed / VELOCITY_TIME_CONSTANT))
  );
}

/**
 * A velocity `idle` ms after the last pointer event: it holds through the gap
 * between two events, then falls towards 0.
 *
 * @internal
 */
export function decayVelocity(velocity: number, idle: number) {
  return (
    velocity *
    Math.exp(-Math.max(0, idle - IDLE_GRACE) / VELOCITY_TIME_CONSTANT)
  );
}

const POINTER_EVENTS = [
  "pointermove",
  "pointerover",
  "pointerout",
  "pointerdown",
  "pointerup",
  "pointercancel",
] as const;

/**
 * Follows the primary pointer, mouse or touch or pen. `onChange` gets `true`
 * when the pointer only moved, and `false` when it can have entered or left
 * an element or changed whether it is pressed.
 *
 * @internal
 */
export function trackPointer(onChange: (moved: boolean) => void) {
  let clientX = 0;
  let clientY = 0;
  let velocityX = 0;
  let velocityY = 0;
  let lastTime: number | null = null;
  let present = false;
  let pressed = false;

  function sample(event: PointerEvent) {
    const elapsed = lastTime === null ? 0 : event.timeStamp - lastTime;
    if (!present) {
      velocityX = 0;
      velocityY = 0;
    } else if (elapsed > 0) {
      velocityX = smoothVelocity(
        velocityX,
        ((event.clientX - clientX) / elapsed) * 1000,
        elapsed,
      );
      velocityY = smoothVelocity(
        velocityY,
        ((event.clientY - clientY) / elapsed) * 1000,
        elapsed,
      );
    }
    clientX = event.clientX;
    clientY = event.clientY;
    lastTime = event.timeStamp;
    present = true;
  }

  function onPointer(event: PointerEvent) {
    if (!event.isPrimary) {
      return;
    }
    switch (event.type) {
      case "pointerover":
        if (event.relatedTarget === null) {
          present = false;
          sample(event);
        }
        break;
      case "pointerout":
        if (event.relatedTarget === null) {
          present = false;
        }
        break;
      case "pointercancel":
        pressed = false;
        present = false;
        break;
      case "pointerup":
        sample(event);
        pressed = false;
        // A finger that lifts leaves the page; a mouse stays over it.
        present = event.pointerType === "mouse";
        break;
      default:
        sample(event);
        pressed ||= event.type === "pointerdown";
    }
    onChange(event.type === "pointermove");
  }

  for (const type of POINTER_EVENTS) {
    window.addEventListener(type, onPointer, { passive: true });
  }

  return {
    /** The pointer at `now`, a `performance.now()` time, in page coordinates. */
    read(scrollX: number, scrollY: number, now: number): EffectPointer {
      const idle = lastTime === null ? 0 : now - lastTime;
      return {
        x: clientX + scrollX,
        y: clientY + scrollY,
        velocityX: decayVelocity(velocityX, idle),
        velocityY: decayVelocity(velocityY, idle),
        pressed,
        present,
      };
    },
    destroy() {
      for (const type of POINTER_EVENTS) {
        window.removeEventListener(type, onPointer);
      }
    },
  };
}
