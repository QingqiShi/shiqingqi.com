import {
  useEffect,
  useRef,
  type PointerEvent,
  type PointerEventHandler,
  type RefObject,
} from "react";
import type { Styles } from "../motion/px.ts";
import { springOf, springRoles } from "../motion/spring-roles.ts";
import { useBinding } from "../motion/use-binding.ts";
import {
  useMotionEngine,
  useMotionValue,
} from "../motion/use-motion-engine.ts";

const PRESS_SPRING = springOf(springRoles.surface);

/**
 * The time in seconds from a press to the first ring of the card's pond,
 * while the card gives way under the finger on `PRESS_SPRING`.
 *
 * @internal
 */
export const PRESS_SINK = 0.06;

/** The scale of a card under the finger: it gives way about the touch point. */
const PRESSED = 0.985;
/** The speed, in scale per second, at which a released card springs back past rest. */
const REBOUND = 0.6;

function pressPose(press: number, originX: number, originY: number): Styles {
  const x = originX * (1 - press);
  const y = originY * (1 - press);
  return {
    transform: `translate(${x.toFixed(3)}px, ${y.toFixed(3)}px) scale(${press.toFixed(5)})`,
  };
}

function noPose(): Styles {
  return {};
}

interface PressOptions<T extends HTMLElement> {
  cardRef: RefObject<T | null>;
  disabled: boolean;
  onPointerDown?: PointerEventHandler<T>;
  onPointerUp?: PointerEventHandler<T>;
  onPointerCancel?: PointerEventHandler<T>;
  onPointerLeave?: PointerEventHandler<T>;
}

/**
 * How an option card answers a press: it sinks about the touch point while
 * the pointer is down, and springs back past rest when it lets go. Gives
 * the card's pointer handlers, which call the caller's own first.
 *
 * @internal
 */
export function useOptionCardPress<T extends HTMLElement>({
  cardRef,
  disabled,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onPointerLeave,
}: PressOptions<T>) {
  const engine = useMotionEngine();
  const press = useMotionValue(engine, 1, { spring: PRESS_SPRING });
  const originX = useMotionValue(engine, 0);
  const originY = useMotionValue(engine, 0);
  useBinding(cardRef, [press, originX, originY], {
    pose: pressPose,
    reducedPose: noPose,
    rest: "clear",
    // The card's pond bends it through an SVG filter, and WebKit does not
    // draw the card while it moves on the compositor.
    renderer: "frame",
  });
  const sinceKeyRef = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      sinceKeyRef.current?.abort();
    },
    [],
  );

  function sink(event: PointerEvent<T>) {
    onPointerDown?.(event);
    const card = cardRef.current;
    if (event.button !== 0 || disabled || card === null) return;
    sinceKeyRef.current?.abort();
    const sinceKey = new AbortController();
    sinceKeyRef.current = sinceKey;
    window.addEventListener(
      "keydown",
      () => {
        sinceKey.abort();
      },
      {
        capture: true,
        signal: sinceKey.signal,
      },
    );
    if (engine.reducedMotion) return;
    const box = card.getBoundingClientRect();
    originX.set(event.clientX - (box.left + box.width / 2));
    originY.set(event.clientY - (box.top + box.height / 2));
    press.to(PRESSED);
  }

  const release =
    (handler: PointerEventHandler<T> | undefined) =>
    (event: PointerEvent<T>) => {
      handler?.(event);
      if (press.target === 1) return;
      press.to(1, { velocity: REBOUND });
    };

  return {
    handlers: {
      onPointerDown: sink,
      onPointerUp: release(onPointerUp),
      onPointerCancel: release(onPointerCancel),
      onPointerLeave: release(onPointerLeave),
    },
    /** Whether a pointer has pressed the card since the last key went down. */
    pressedSinceKey: () => sinceKeyRef.current?.signal.aborted === false,
  };
}
