import {
  useEffect,
  useEffectEvent,
  useRef,
  type PointerEvent,
  type RefObject,
} from "react";
import { MD_QUERY } from "../md-query.ts";
import type { SheetMotion } from "./create-sheet-motion.ts";
import {
  claimGesture,
  releaseVelocity,
  rubberBand,
  shouldDismiss,
  type DragSample,
  type DragStart,
} from "./should-dismiss.ts";

const MAX_SAMPLES = 12;
const NO_DRAG = "input[type='range'], textarea, [contenteditable]";

interface Drag {
  readonly pointerId: number;
  readonly start: DragStart;
  readonly target: Element;
  readonly startX: number;
  startY: number;
  /** How far down the card was when the drag took it. */
  base: number;
  /** How far down the drag has taken the card. */
  y: number;
  isActive: boolean;
  samples: DragSample[];
}

interface SheetDragOptions {
  /** The card: the sheet's surface, which takes the pointer. */
  readonly cardRef: RefObject<HTMLElement | null>;
  /** The motion of the card, which the drag takes over. */
  readonly motionRef: RefObject<SheetMotion | null>;
  /** The box the content scrolls in. */
  readonly scrollerRef: RefObject<HTMLElement | null>;
  /** The grabber, which starts a drag for any pointer. */
  readonly grabberRef: RefObject<HTMLElement | null>;
  /**
   * The box around the close button. The top row reaches from the top of the
   * card to as far below this box as the box is below the top of the card.
   */
  readonly closeCornerRef: RefObject<HTMLElement | null>;
  /** Whether a drag can start: the sheet is shown and not leaving. */
  readonly isEnabled: boolean;
  /** A drag let go far enough or fast enough to close the sheet. */
  readonly onDismiss: () => void;
}

/**
 * How far the target, or the box between it and the scroller that is
 * scrolled furthest, is scrolled down, in px. Below 0 while iOS stretches it
 * past its top.
 */
function scrolledBy(target: Element, scroller: Element | null) {
  let furthest = Number.NEGATIVE_INFINITY;
  for (
    let node: Element | null = target;
    node !== null;
    node = node.parentElement
  ) {
    furthest = Math.max(furthest, node.scrollTop);
    if (node === scroller) break;
  }
  return furthest;
}

/**
 * The drag that puts a Sheet's card away. Spread the returned handlers on
 * the card. The card follows the pointer 1:1, and the dimmed page gets
 * brighter with the distance the card has gone. A drag let go far enough
 * or fast enough calls `onDismiss`; any other drag springs the card back.
 * Either way, the card moves on at the speed of the pointer.
 *
 * A drag starts below `md` only, where the card sits at the bottom of the
 * screen and a pull down reads as putting it away. Any pointer drags the
 * grabber. Only touch drags the rest of the card, so that a mouse can still
 * select text: the top row always, and the content only with a pull down
 * while it is scrolled to its top. Anywhere else, the content scrolls.
 *
 * @internal
 */
export function useSheetDrag({
  cardRef,
  motionRef,
  scrollerRef,
  grabberRef,
  closeCornerRef,
  isEnabled,
  onDismiss,
}: SheetDragOptions) {
  const dragRef = useRef<Drag | null>(null);

  const isInTopRow = (clientY: number) => {
    const card = cardRef.current;
    const corner = closeCornerRef.current;
    if (!card || !corner) return false;
    const cardTop = card.getBoundingClientRect().top;
    const { top, bottom } = corner.getBoundingClientRect();
    return clientY < bottom + (top - cardTop);
  };

  /** Where a touch that went down on the target can start a drag, if it can. */
  const touchStart = (
    event: PointerEvent,
    target: Element,
  ): DragStart | null => {
    if (event.pointerType !== "touch") return null;
    if (target.closest(NO_DRAG)) return null;
    if (isInTopRow(event.clientY)) return "top-row";
    if (scrollerRef.current?.contains(target)) return "content";
    return null;
  };

  const claim = (drag: Drag, x: number, y: number) =>
    claimGesture(
      drag.start,
      x - drag.startX,
      y - drag.startY,
      scrolledBy(drag.target, scrollerRef.current),
    );

  const begin = (drag: Drag, event: PointerEvent) => {
    const card = cardRef.current;
    const motion = motionRef.current;
    if (!card || !motion) return;
    const y = motion.grab();
    drag.isActive = true;
    drag.base = y;
    drag.y = y;
    drag.startY = event.clientY;
    try {
      card.setPointerCapture(event.pointerId);
    } catch {
      // A pointer that is gone cannot be captured, and the drag goes on.
    }
  };

  const onPointerDown = (event: PointerEvent) => {
    const { target, currentTarget } = event;
    if (dragRef.current || !isEnabled) return;
    if (!event.isPrimary || event.button !== 0) return;
    if (window.matchMedia(MD_QUERY).matches) return;
    // React also sends the events of a portal in the content, such as a
    // menu, which is not in the card.
    if (!(target instanceof Element) || !currentTarget.contains(target)) {
      return;
    }
    const isOnGrabber = grabberRef.current?.contains(target) ?? false;
    const start = isOnGrabber ? "grabber" : touchStart(event, target);
    if (!start) return;
    const drag: Drag = {
      pointerId: event.pointerId,
      start,
      target,
      startX: event.clientX,
      startY: event.clientY,
      base: 0,
      y: 0,
      isActive: false,
      samples: [],
    };
    dragRef.current = drag;
    if (isOnGrabber) {
      event.preventDefault();
      begin(drag, event);
    }
  };

  const onPointerMove = (event: PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (!drag.isActive) {
      const decision = claim(drag, event.clientX, event.clientY);
      if (decision === "wait") return;
      if (decision === "release") {
        dragRef.current = null;
        return;
      }
      begin(drag, event);
    }
    drag.samples.push({ time: performance.now(), y: event.clientY });
    if (drag.samples.length > MAX_SAMPLES) drag.samples.shift();
    drag.y = rubberBand(drag.base + event.clientY - drag.startY);
    motionRef.current?.drag(drag.y);
  };

  const release = (event: PointerEvent, canDismiss: boolean) => {
    const drag = dragRef.current;
    const card = cardRef.current;
    const motion = motionRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    dragRef.current = null;
    if (!drag.isActive || !card || !motion) return;
    const velocity = releaseVelocity(drag.samples, performance.now());
    motion.release(velocity * 1000);
    if (canDismiss && shouldDismiss(drag.y, velocity, card.offsetHeight)) {
      onDismiss();
    } else {
      motion.settle();
    }
  };

  // The browser scrolls the content on a touch unless the first move is
  // cancelled. So a move that drags cancels it here, before the browser
  // takes the gesture and sends `pointercancel`. React listens to
  // `touchmove` as passive, so this listener is on the card itself.
  const onTouchMove = useEffectEvent((event: TouchEvent) => {
    const drag = dragRef.current;
    if (!drag || !event.cancelable) return;
    const touch = event.touches.item(0);
    if (
      drag.isActive ||
      (touch && claim(drag, touch.clientX, touch.clientY) === "drag")
    ) {
      event.preventDefault();
    }
  });

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const listener = (event: TouchEvent) => {
      onTouchMove(event);
    };
    card.addEventListener("touchmove", listener, { passive: false });
    return () => {
      card.removeEventListener("touchmove", listener);
    };
  }, [cardRef]);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: (event: PointerEvent) => {
      release(event, true);
    },
    onPointerCancel: (event: PointerEvent) => {
      release(event, false);
    },
  };
}
