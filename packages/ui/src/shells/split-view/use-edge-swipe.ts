import { useEffect, useEffectEvent, type RefObject } from "react";
import {
  releaseVelocity,
  type DragSample,
} from "../../surfaces/should-dismiss.ts";
import {
  claimEdgeSwipe,
  EDGE_SWIPE_ZONE,
  shouldPop,
} from "../claim-edge-swipe.ts";
import type { PageScroll } from "../create-page-scroll.ts";
import type { SplitViewMotion } from "../create-split-view-motion.ts";
import { isViewStacked } from "../split-view-motion/is-view-stacked.ts";
import type { SplitViewBackLink } from "./types.ts";

/**
 * The swipe back from the inline-start edge of the content, where the
 * content fills the view, as on a phone. The screen follows the finger, and
 * the swipe goes back where it is let go far enough or fast enough. Else
 * the screen springs back in.
 *
 * @internal
 */
export function useEdgeSwipe(
  view: HTMLElement | null,
  motionRef: RefObject<SplitViewMotion | null>,
  pageScrollRef: RefObject<PageScroll | null>,
  back: SplitViewBackLink | null,
  takeOff: (href: string) => void,
) {
  const goBack = useEffectEvent(() => {
    if (back !== null) takeOff(back.href);
  });
  const canSwipe = useEffectEvent(() => back !== null);
  useEffect(() => {
    if (view === null) return;
    let swipe: {
      pointerId: number;
      column: HTMLElement;
      startX: number;
      startY: number;
      width: number;
      isActive: boolean;
      samples: DragSample[];
    } | null = null;
    const content = () =>
      view.querySelector<HTMLElement>(
        ':scope > * > [data-split-view-column="content"]',
      );
    const onDown = (event: PointerEvent) => {
      if (swipe !== null || !event.isPrimary || event.button !== 0) return;
      if (!canSwipe()) return;
      const column = content();
      if (column === null || !(event.target instanceof Node)) return;
      if (!column.contains(event.target)) return;
      swipe = {
        pointerId: event.pointerId,
        column,
        startX: event.clientX,
        startY: event.clientY,
        width: 0,
        isActive: false,
        samples: [],
      };
    };
    // The layout is read only for a press that moves, so a tap costs nothing.
    const startsAtEdge = (started: NonNullable<typeof swipe>) => {
      if (!isViewStacked(view)) return false;
      const box = started.column.getBoundingClientRect();
      started.width = box.width;
      return started.startX - box.left <= EDGE_SWIPE_ZONE;
    };
    const onMove = (event: PointerEvent) => {
      if (swipe === null || event.pointerId !== swipe.pointerId) return;
      const dx = event.clientX - swipe.startX;
      if (!swipe.isActive) {
        const decision = claimEdgeSwipe(dx, event.clientY - swipe.startY);
        if (decision === "wait") return;
        if (decision === "release" || !startsAtEdge(swipe)) {
          swipe = null;
          return;
        }
        pageScrollRef.current?.align();
        if (motionRef.current?.beginSwipe() !== true) {
          swipe = null;
          return;
        }
        swipe.isActive = true;
        try {
          view.setPointerCapture(event.pointerId);
        } catch {
          // A pointer that is gone cannot be captured, and the swipe goes on.
        }
      }
      swipe.samples.push({ time: performance.now(), y: event.clientX });
      if (swipe.samples.length > 12) swipe.samples.shift();
      motionRef.current?.drag(1 - Math.min(1, Math.max(0, dx / swipe.width)));
    };
    const onUp = (event: PointerEvent, canPop: boolean) => {
      if (swipe === null || event.pointerId !== swipe.pointerId) return;
      const ended = swipe;
      swipe = null;
      if (!ended.isActive) return;
      const velocity = releaseVelocity(ended.samples, performance.now());
      const pop =
        canPop &&
        shouldPop(event.clientX - ended.startX, velocity, ended.width);
      motionRef.current?.release(pop, (-velocity * 1000) / ended.width);
      swipedAt = performance.now();
      if (pop) goBack();
    };
    // The click that ends a swipe must not follow the link under it.
    let swipedAt = Number.NEGATIVE_INFINITY;
    const onClick = (event: Event) => {
      if (performance.now() - swipedAt > 300) return;
      swipedAt = Number.NEGATIVE_INFINITY;
      event.preventDefault();
      event.stopPropagation();
    };
    const onPointerUp = (event: PointerEvent) => {
      onUp(event, true);
    };
    const onCancel = (event: PointerEvent) => {
      onUp(event, false);
    };
    view.addEventListener("pointerdown", onDown);
    view.addEventListener("pointermove", onMove);
    view.addEventListener("pointerup", onPointerUp);
    view.addEventListener("pointercancel", onCancel);
    view.addEventListener("click", onClick, { capture: true });
    return () => {
      view.removeEventListener("click", onClick, { capture: true });
      view.removeEventListener("pointerdown", onDown);
      view.removeEventListener("pointermove", onMove);
      view.removeEventListener("pointerup", onPointerUp);
      view.removeEventListener("pointercancel", onCancel);
    };
  }, [view, motionRef, pageScrollRef]);
}
