import { useEffect, useRef, useState, type PointerEvent } from "react";
import { clamp } from "../clamp.ts";
import type { Styles } from "../motion/px.ts";
import { useBinding } from "../motion/use-binding.ts";
import {
  useMotionEngine,
  useMotionValue,
} from "../motion/use-motion-engine.ts";
import { DRAG_THRESHOLD } from "./index-at.ts";

/** How far the thumb widens and flattens under a press, as shares of its size. */
const PRESS_WIDEN = 0.12;
const PRESS_FLATTEN = 0.06;
/** The speed, per second, at which a released thumb springs back past its rest shape. */
const REBOUND = 4;
/** How much of its width the thumb can lose against an end of the track. */
const MAX_SQUASH = 0.3;
/** The squash for each share of the travel that the thumb is past an end. */
const SQUASH_RATE = 4;
/** How far past an end, as a share of the travel, a pull can take the thumb's motion. */
const MAX_PULL = 0.05;
/**
 * The time in seconds after a press beside the thumb in which the thumb
 * springs after the pointer. After it, the thumb is under the pointer.
 */
const CHASE_TIME = 0.3;

function carrierPose(position: number): Styles {
  return { translate: `${(clamp(position, 0, 1) * 100).toFixed(3)}% 0` };
}

function fillPose(position: number): Styles {
  return { translate: `${((clamp(position, 0, 1) - 1) * 100).toFixed(3)}% 0` };
}

/**
 * The shape of the thumb: wider and flatter under a press, and squashed
 * against the end of the track that its motion goes past.
 */
function thumbPose(press: number, position: number): Styles {
  const past = position - clamp(position, 0, 1);
  const squash = Math.min(MAX_SQUASH, Math.abs(past) * SQUASH_RATE);
  const shift = Math.sign(past) * squash * 50;
  const scaleX = (1 + PRESS_WIDEN * press) * (1 - squash);
  const scaleY = (1 - PRESS_FLATTEN * press) * (1 + squash * 0.25);
  return {
    transform: `translateX(${shift.toFixed(3)}%) scale(${scaleX.toFixed(4)}, ${scaleY.toFixed(4)})`,
  };
}

function noPose(): Styles {
  return {};
}

function decimalsOf(value: number) {
  const [, decimals = ""] = String(value).split(".");
  return decimals.length;
}

/** The value of the step nearest to `share` of the range. */
function valueAt(share: number, min: number, max: number, step: number) {
  const span = max - min;
  if (span <= 0) return min;
  const size = step > 0 ? step : 1;
  const steps = Math.min(
    Math.round((share * span) / size),
    Math.floor(span / size),
  );
  const digits = Math.max(decimalsOf(size), decimalsOf(min));
  return Number((min + steps * size).toFixed(digits));
}

interface Hold {
  readonly pointerId: number;
  /** Where the centre of the thumb is at the start of the travel, in the viewport. */
  readonly start: number;
  /** The length of the travel, in CSS px. */
  readonly travel: number;
  /** From the centre of the thumb to the pointer, when the press is on the thumb. */
  readonly offset: number;
  /**
   * A touch beside the thumb can be the start of a scroll of the page, so
   * the thumb waits for a move along the track or for the release.
   */
  waits: boolean;
  /** Where the press started, in the viewport, along the track as the hold reads it. */
  readonly pressX: number;
  readonly pressY: number;
  /** The engine time until which the thumb springs after the pointer. */
  chaseUntil: number;
  /**
   * The sum of the left and the right of the track in the viewport, for a
   * right-to-left track, whose start is at its right, or `null`. The hold
   * reads each pointer place mirrored about the centre of the track.
   */
  readonly mirror: number | null;
  /** The timer that ends the chase while the pointer does not move. */
  chaseTimer: ReturnType<typeof setTimeout> | undefined;
}

interface SliderThumbOptions {
  value: number;
  min: number;
  max: number;
  step: number;
  disabled: boolean;
  /** Called when a press starts on the track. */
  onPress: () => void;
  /** Called with each new value, from the pointer or from `change`. */
  onChange: (value: number) => void;
  /** Called when a press on the track ends. */
  onRelease: () => void;
}

/**
 * The thumb of a `Slider` and the fill behind it, on the motion engine. A
 * press on the thumb holds it under the pointer, also between two steps. A
 * press beside it sends it to the pointer on the system spring, and a drag
 * from there goes on from where it is. `heldAt` says where the pointer holds
 * the thumb, from the press on it or from the end of that spring. Any other change of `value`, such as
 * a key, sends it to the new value on the same spring. A press widens the
 * thumb where the liquid does not draw it, and the thumb squashes against an end of the track that its motion
 * goes past.
 *
 * @internal
 */
export function useSliderThumb({
  value,
  min,
  max,
  step,
  disabled,
  onPress,
  onChange,
  onRelease,
}: SliderThumbOptions) {
  const carrierRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const holdRef = useRef<Hold | null>(null);
  const lastValueRef = useRef(value);
  const [isHeld, setIsHeld] = useState(false);
  /** Where the pointer holds the thumb, as a share of the travel. */
  const [heldAt, setHeldAt] = useState<number | null>(null);
  /** The track runs from right to left, as its `direction` says. */
  const [isReversed, setIsReversed] = useState(false);

  function readDirection(track: HTMLElement) {
    const reversed = getComputedStyle(track).direction === "rtl";
    setIsReversed(reversed);
    return reversed;
  }

  const directionRef = (track: HTMLElement | null) => {
    if (track !== null) {
      readDirection(track);
    }
  };

  const along = (held: Hold, clientX: number) =>
    held.mirror === null ? clientX : held.mirror - clientX;

  const span = max - min;
  const share = span > 0 ? clamp((value - min) / span, 0, 1) : 0;

  const engine = useMotionEngine();
  const position = useMotionValue(engine, share);
  const press = useMotionValue(engine, 0);
  useBinding(carrierRef, position, { pose: carrierPose });
  useBinding(fillRef, position, { pose: fillPose });
  useBinding(thumbRef, [press, position], {
    pose: thumbPose,
    reducedPose: noPose,
    rest: "clear",
  });

  useEffect(() => {
    lastValueRef.current = value;
    if (!isHeld && position.target !== share) {
      position.to(share);
    }
  }, [value, share, isHeld, position]);

  function change(next: number) {
    if (next === lastValueRef.current) return;
    lastValueRef.current = next;
    onChange(next);
  }

  function follow(hold: Hold, clientX: number, chase: boolean) {
    const at = (clientX - hold.offset - hold.start) / hold.travel;
    const pull = at - clamp(at, 0, 1);
    const shown =
      clamp(at, 0, 1) +
      Math.sign(pull) * MAX_PULL * (1 - 1 / (1 + Math.abs(pull) * 8));
    if (chase) {
      position.to(shown);
    } else {
      setHeldAt(clamp(at, 0, 1));
      position.set(shown);
    }
    change(valueAt(clamp(at, 0, 1), min, max, step));
  }

  /** Sends the thumb to the pointer on the spring. */
  function jump(held: Hold, clientX: number) {
    held.waits = false;
    held.chaseUntil = engine.loop.now() + CHASE_TIME;
    press.to(1);
    follow(held, clientX, true);
    // The thumb is solid while it springs to the pointer. The pointer holds
    // it from the end of the chase, also when it does not move again.
    clearTimeout(held.chaseTimer);
    held.chaseTimer = setTimeout(() => {
      if (holdRef.current === held) {
        setHeldAt((at) => at ?? clamp(position.target, 0, 1));
      }
    }, CHASE_TIME * 1000);
  }

  function hold(event: PointerEvent<HTMLDivElement>) {
    const carrier = carrierRef.current;
    if (
      disabled ||
      carrier === null ||
      holdRef.current !== null ||
      (event.pointerType === "mouse" && event.button !== 0)
    ) {
      return;
    }
    const travel = carrier.offsetWidth;
    if (travel <= 0) return;
    const track = event.currentTarget;
    const box = track.getBoundingClientRect();
    const mirror = readDirection(track) ? box.left + box.right : null;
    const pressX = mirror === null ? event.clientX : mirror - event.clientX;
    const reach = (box.width - travel) / 2;
    const start = box.left + reach;
    const centre = start + clamp(position.get(), 0, 1) * travel;
    const isOnThumb = Math.abs(pressX - centre) <= reach;
    const next: Hold = {
      pointerId: event.pointerId,
      start,
      travel,
      offset: isOnThumb ? pressX - centre : 0,
      waits: !isOnThumb && event.pointerType === "touch",
      pressX,
      pressY: event.clientY,
      mirror,
      chaseUntil: 0,
      chaseTimer: undefined,
    };
    holdRef.current = next;
    setIsHeld(true);
    track.setPointerCapture(event.pointerId);
    onPress();
    if (isOnThumb) {
      setHeldAt(clamp(position.get(), 0, 1));
      press.to(1);
      position.stop();
    } else if (!next.waits) {
      jump(next, pressX);
    }
  }

  function drag(event: PointerEvent<HTMLDivElement>) {
    const held = holdRef.current;
    if (held === null || event.pointerId !== held.pointerId) return;
    if (held.waits) {
      const moved = Math.abs(along(held, event.clientX) - held.pressX);
      const across = Math.abs(event.clientY - held.pressY);
      if (moved >= DRAG_THRESHOLD && moved > across) {
        jump(held, along(held, event.clientX));
      }
      return;
    }
    follow(
      held,
      along(held, event.clientX),
      position.isMoving && engine.loop.now() < held.chaseUntil,
    );
  }

  function release(event: PointerEvent<HTMLDivElement>) {
    const held = holdRef.current;
    if (held !== null && event.pointerId === held.pointerId) {
      if (held.waits && event.type === "pointerup") {
        jump(held, along(held, event.clientX));
      }
      clearTimeout(held.chaseTimer);
      holdRef.current = null;
      setIsHeld(false);
      setHeldAt(null);
      press.to(0, { velocity: -REBOUND });
    }
    onRelease();
  }

  return {
    /** Where the value is, as a share of the range. */
    share,
    carrierRef,
    fillRef,
    thumbRef,
    /**
     * Where the pointer holds the thumb, as a share of the travel, or
     * `null` while no pointer moves it.
     */
    heldAt,
    /**
     * The track runs from right to left. The track draws mirrored then, and
     * the hook reads the pointer mirrored.
     */
    isReversed,
    /** Reads the direction of the track it is attached to. */
    directionRef,
    /** Takes a value from the input. */
    change,
    trackHandlers: {
      onPointerEnter: (event: PointerEvent<HTMLDivElement>) => {
        readDirection(event.currentTarget);
      },
      onPointerDown: hold,
      onPointerMove: drag,
      onPointerUp: release,
      onPointerCancel: release,
      onLostPointerCapture: release,
    },
  };
}
