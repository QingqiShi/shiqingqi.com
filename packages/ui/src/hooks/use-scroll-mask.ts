import { useEffect, useState } from "react";
import { observeChildren } from "../utils/observe-children.ts";

export type ScrollMaskOrientation = "horizontal" | "vertical";

/**
 * Tracks a scroll region's position on one axis to decide whether each edge
 * carries a Scroll mask. `showStartMask` turns true once the content is
 * scrolled away from the start edge (left for horizontal, top for vertical);
 * `showEndMask` stays true while content remains hidden past the end edge.
 * Listens to scroll events, container resizes, and child additions/
 * removals/resizes so `scrollWidth`/`scrollHeight` changes that leave the
 * container's own box unchanged still trigger a remeasure.
 */
export function useScrollMask(
  scrollRef: React.RefObject<HTMLElement | null>,
  orientation: ScrollMaskOrientation = "horizontal",
) {
  const [showStartMask, setShowStartMask] = useState(false);
  const [showEndMask, setShowEndMask] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const update = () => {
      const isHorizontal = orientation === "horizontal";
      const scrollStart = isHorizontal ? el.scrollLeft : el.scrollTop;
      const scrollSize = isHorizontal ? el.scrollWidth : el.scrollHeight;
      const clientSize = isHorizontal ? el.clientWidth : el.clientHeight;
      setShowStartMask(Math.round(scrollStart) > 0);
      setShowEndMask(Math.round(scrollStart) + clientSize < scrollSize - 1);
    };

    el.addEventListener("scroll", update, { passive: true });

    // ResizeObserver fires its callback asynchronously after observe(),
    // which handles initial state without a synchronous setState in the effect.
    // The container's own box and each direct child are watched, so content
    // that grows (items streamed in, filmography resolving more credits) is
    // remeasured even when the container is unchanged.
    // Falls back to a rAF-deferred call in environments without ResizeObserver (e.g. jsdom).
    let unobserve: (() => void) | undefined;
    if (typeof ResizeObserver === "undefined") {
      requestAnimationFrame(update);
    } else {
      unobserve = observeChildren(el, update, { includeContainer: true });
    }

    return () => {
      el.removeEventListener("scroll", update);
      unobserve?.();
    };
  }, [scrollRef, orientation]);

  return { showStartMask, showEndMask };
}
